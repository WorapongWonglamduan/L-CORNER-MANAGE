/** Amount is always in full currency units (e.g. THB, not satang) — each
 * driver converts to whatever subunit its own gateway expects internally. */
export interface CreateChargeInput {
  amount: number;
  currency: string;
  method: string;
  /** Client-side-tokenized card (e.g. Omise.js `tokn_...`) — raw card
   * numbers never reach our server. Only present for method: "card". */
  cardToken?: string;
  /** Shown in the gateway's own dashboard for manual lookup during support/
   * refund — not used for anything this app reads back. */
  metadata?: Record<string, string>;
}

export type ChargeStatus = "succeeded" | "pending" | "failed";

export interface ChargeResult {
  gatewayReference: string;
  status: ChargeStatus;
  /** Present for QR-image methods (e.g. Omise's PromptPay/TrueMoney QR) — a
   * gateway-hosted image to render directly, shown while the payment is
   * pending. Mutually exclusive with `qrPayload` below. */
  qrImageUrl?: string;
  /** Present for redirect-link methods (e.g. PayPal's customer-approval
   * URL) — a raw string for the client to render as its own QR code (via
   * react-qr-code), since the gateway hands back a URL rather than a
   * pre-rendered image. Mutually exclusive with `qrImageUrl` above. */
  qrPayload?: string;
  failureReason?: string;
}

export interface ChargeStatusResult {
  status: ChargeStatus;
  failureReason?: string;
}

export interface WebhookEvent {
  gatewayReference: string;
}

/**
 * One gateway integration. Mirrors `StorageDriver` (src/lib/storage/types.ts)
 * — a small interface, one concrete class per provider, each owning its own
 * env-var validation.
 *
 * `verifyWebhookSignature`/`parseWebhookEvent` exist only to decide WHETHER
 * to bother re-checking sooner — `reconcileIntent` (src/lib/payments/
 * reconcile.ts) never trusts a webhook payload's own status field, always
 * re-asks the gateway itself via `getChargeStatus`. This matches Omise's own
 * documented advice: "retrieve the charge using its id and confirm that its
 * status matches the status of the charge contained in the event" — treat
 * every webhook as a hint to check sooner, never as the verdict itself.
 */
export interface PaymentDriver {
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getChargeStatus(gatewayReference: string): Promise<ChargeStatusResult>;
  /** Returns false (never throws) for a malformed/unverifiable request —
   * callers should treat that the same as "don't trust this," not crash. */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  /** Returns null if the payload isn't a recognizable event for this
   * driver — never throws on malformed input. */
  parseWebhookEvent(rawBody: string): WebhookEvent | null;
}
