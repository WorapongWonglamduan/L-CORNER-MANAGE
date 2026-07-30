import { createHmac, timingSafeEqual } from "crypto";
import type {
  ChargeResult,
  ChargeStatus,
  ChargeStatusResult,
  CreateChargeInput,
  PaymentDriver,
  WebhookEvent,
} from "./types";

const OMISE_API_BASE = "https://api.omise.co";

interface OmiseChargeResponse {
  id: string;
  status: "failed" | "expired" | "pending" | "reversed" | "successful";
  failure_message?: string | null;
  source?: {
    scannable_code?: {
      image?: {
        download_uri?: string;
      };
    };
  };
}

// Omise's own charge.status doesn't map 1:1 onto this app's 3-state model —
// "reversed" (a captured charge later reversed, e.g. by Omise itself for
// fraud) and "expired" both mean "this will never become money," same as
// "failed" from our side's perspective.
function toChargeStatus(status: OmiseChargeResponse["status"]): ChargeStatus {
  if (status === "successful") return "succeeded";
  if (status === "pending") return "pending";
  return "failed";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to use the Omise payment driver`);
  }
  return value;
}

/**
 * Real implementation via typed `fetch` against Omise's REST API — no SDK
 * dependency, so the request/response shapes are visible right here instead
 * of behind an opaque client. Covers "card" (an Omise.js-tokenized card,
 * synchronous) and "promptpay" (a source-based charge that starts `pending`
 * and shows a QR the customer scans, confirmed later via reconciliation).
 *
 * Amounts are always full currency units (e.g. 150.5 = ฿150.50) in this
 * app's own models — Omise expects the smallest subunit (satang for THB),
 * so every amount is multiplied by 100 going in.
 */
export class OmiseDriver implements PaymentDriver {
  private secretKey: string;
  private webhookSecret: string | null;

  constructor() {
    this.secretKey = requireEnv("OMISE_SECRET_KEY");
    // Only required to verify webhook signatures — createCharge/
    // getChargeStatus work without it (useful while first wiring things up,
    // before a webhook endpoint is even configured in the Omise dashboard).
    this.webhookSecret = process.env.OMISE_WEBHOOK_SECRET || null;
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`;
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const body: Record<string, unknown> = {
      amount: Math.round(input.amount * 100),
      currency: input.currency,
    };

    if (input.method === "card") {
      if (!input.cardToken) {
        throw new Error("OmiseDriver: cardToken is required for method 'card'");
      }
      body.card = input.cardToken;
    } else if (input.method === "promptpay") {
      body.source = { type: "promptpay" };
    } else {
      throw new Error(`OmiseDriver: unsupported method '${input.method}'`);
    }

    const response = await fetch(`${OMISE_API_BASE}/charges`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as OmiseChargeResponse & { message?: string };
    if (!response.ok) {
      throw new Error(data.message || `Omise createCharge failed (${response.status})`);
    }

    return {
      gatewayReference: data.id,
      status: toChargeStatus(data.status),
      qrImageUrl: data.source?.scannable_code?.image?.download_uri,
      failureReason: data.failure_message ?? undefined,
    };
  }

  async getChargeStatus(gatewayReference: string): Promise<ChargeStatusResult> {
    const response = await fetch(`${OMISE_API_BASE}/charges/${gatewayReference}`, {
      headers: { Authorization: this.authHeader() },
    });

    const data = (await response.json()) as OmiseChargeResponse & { message?: string };
    if (!response.ok) {
      throw new Error(data.message || `Omise getChargeStatus failed (${response.status})`);
    }

    return {
      status: toChargeStatus(data.status),
      failureReason: data.failure_message ?? undefined,
    };
  }

  // Omise signs webhooks with HMAC-SHA256 over "{timestamp}.{raw_body}",
  // using the base64-decoded webhook secret, hex-encoded — the
  // `Omise-Signature` header may carry more than one comma-separated
  // signature (Omise rotates secrets without a hard cutover), so any match
  // is accepted. This is a pre-filter to decide whether to bother checking
  // sooner, NOT the source of truth — reconcileIntent always re-asks Omise
  // via getChargeStatus regardless of whether this passes, per Omise's own
  // documented recommendation to re-fetch rather than trust the payload.
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    if (!this.webhookSecret) return false;

    const signatureHeader = headers.get("omise-signature");
    const timestamp = headers.get("omise-signature-timestamp");
    if (!signatureHeader || !timestamp) return false;

    let secretBuffer: Buffer;
    try {
      secretBuffer = Buffer.from(this.webhookSecret, "base64");
    } catch {
      return false;
    }

    const expected = createHmac("sha256", secretBuffer)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    return signatureHeader.split(",").some((candidate) => {
      const candidateBuffer = Buffer.from(candidate.trim(), "hex");
      if (candidateBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(candidateBuffer, expectedBuffer);
    });
  }

  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const event = JSON.parse(rawBody) as { data?: { id?: string; object?: string } };
      if (event.data?.object !== "charge" || !event.data.id) return null;
      return { gatewayReference: event.data.id };
    } catch {
      return null;
    }
  }
}
