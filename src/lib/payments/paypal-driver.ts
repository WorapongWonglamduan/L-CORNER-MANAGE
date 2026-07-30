import type {
  ChargeResult,
  ChargeStatus,
  ChargeStatusResult,
  CreateChargeInput,
  PaymentDriver,
  WebhookEvent,
} from "./types";

const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

interface PayPalOrder {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: Array<{ rel: string; href: string }>;
}

interface PayPalCaptureResult {
  status?: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
}

// Only "COMPLETED" is money-in-hand — everything else (CREATED, SAVED,
// APPROVED, PAYER_ACTION_REQUIRED) just means the payer hasn't finished
// approving/authorizing yet, same as PromptPay's "pending" while the
// customer hasn't scanned. "VOIDED" is the one terminal failure state.
function toChargeStatus(status: PayPalOrder["status"]): ChargeStatus {
  if (status === "COMPLETED") return "succeeded";
  if (status === "VOIDED") return "failed";
  return "pending";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to use the PayPal payment driver`);
  }
  return value;
}

function errorMessageFrom(data: { message?: string; details?: Array<{ description?: string }> }, fallback: string) {
  return data.details?.[0]?.description || data.message || fallback;
}

/**
 * Real implementation via typed `fetch` against PayPal's Orders v2 REST API
 * (no SDK). PayPal has no in-person QR/scan flow of its own — this uses the
 * Orders API's "approve" link (the URL a payer normally gets redirected to
 * in a web checkout) as the payload for a customer-facing QR instead, via
 * `ChargeResult.qrPayload` (see types.ts) rather than `qrImageUrl`. The
 * customer scans it with their phone, approves in their own PayPal app/
 * browser, and our poll loop (`getChargeStatus`, called every few seconds by
 * `reconcile.ts`) picks up the approval and captures the funds — see below.
 *
 * Amounts are full currency units as a decimal string (e.g. "150.50") —
 * unlike Omise, PayPal does NOT want the smallest subunit.
 */
export class PayPalDriver implements PaymentDriver {
  private clientId: string;
  private clientSecret: string;
  private appUrl: string;

  constructor() {
    this.clientId = requireEnv("PAYPAL_CLIENT_ID");
    this.clientSecret = requireEnv("PAYPAL_CLIENT_SECRET");
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3077";
  }

  // Fetched fresh on every call rather than cached — simplest correct
  // option, and this driver's calls only happen a few times a minute at
  // most (charge creation + a 3s poll loop), nowhere near a volume where
  // token-fetch overhead matters.
  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = (await response.json()) as { access_token?: string; error_description?: string };
    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || "PayPal authentication failed");
    }
    return data.access_token;
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    if (input.method !== "paypal") {
      throw new Error(`PayPalDriver: unsupported method '${input.method}'`);
    }

    const accessToken = await this.getAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: input.currency.toUpperCase(),
              value: input.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          // Skips PayPal's own "Continue"/review step, dropping the payer
          // straight into a "Pay Now" button — this is a one-shot in-person
          // charge, not a multi-step web checkout.
          user_action: "PAY_NOW",
          return_url: `${this.appUrl}/th/pos`,
          cancel_url: `${this.appUrl}/th/pos`,
        },
      }),
    });

    const data = (await response.json()) as PayPalOrder & {
      message?: string;
      details?: Array<{ description?: string }>;
    };
    if (!response.ok) {
      throw new Error(errorMessageFrom(data, `PayPal createOrder failed (${response.status})`));
    }

    const approveUrl = data.links?.find((link) => link.rel === "approve")?.href;
    return {
      gatewayReference: data.id,
      status: toChargeStatus(data.status),
      qrPayload: approveUrl,
    };
  }

  async getChargeStatus(gatewayReference: string): Promise<ChargeStatusResult> {
    const accessToken = await this.getAccessToken();
    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${gatewayReference}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = (await orderResponse.json()) as PayPalOrder & { message?: string };
    if (!orderResponse.ok) {
      throw new Error(order.message || `PayPal getOrder failed (${orderResponse.status})`);
    }

    if (order.status === "COMPLETED") return { status: "succeeded" };
    if (order.status === "VOIDED") return { status: "failed", failureReason: "Order voided" };
    if (order.status !== "APPROVED") {
      // CREATED / SAVED / PAYER_ACTION_REQUIRED — payer hasn't approved yet.
      return { status: "pending" };
    }

    // Payer has approved but PayPal hasn't captured the funds yet — this is
    // the one place allowed to move that forward, matching this app's
    // "getChargeStatus is the authoritative check" contract (reconcile.ts
    // never trusts a webhook payload, always re-asks the gateway itself).
    const captureResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${gatewayReference}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    const capture = (await captureResponse.json()) as PayPalCaptureResult & {
      message?: string;
      details?: Array<{ description?: string }>;
    };
    if (!captureResponse.ok) {
      throw new Error(errorMessageFrom(capture, `PayPal capture failed (${captureResponse.status})`));
    }
    if (capture.status === "COMPLETED") return { status: "succeeded" };
    if (capture.status === "DECLINED" || capture.status === "FAILED") {
      return { status: "failed", failureReason: `Capture ${capture.status.toLowerCase()}` };
    }
    // PENDING (e.g. a risk-review hold) — still not money-in-hand yet.
    return { status: "pending" };
  }

  // PayPal verifies webhooks via a server-to-server call to its own
  // /v1/notifications/verify-webhook-signature API, not a local HMAC check
  // like Omise's — not implemented in this pass. reconcile.ts's pull-based
  // poll loop (getChargeStatus above) is a complete, correct integration on
  // its own without a working webhook.
  verifyWebhookSignature(_rawBody: string, _headers: Headers): boolean {
    return false;
  }

  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const event = JSON.parse(rawBody) as {
        resource?: { id?: string; supplementary_data?: { related_ids?: { order_id?: string } } };
      };
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id;
      if (!orderId) return null;
      return { gatewayReference: orderId };
    } catch {
      return null;
    }
  }
}
