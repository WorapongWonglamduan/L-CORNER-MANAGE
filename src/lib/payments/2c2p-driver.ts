import type {
  ChargeResult,
  ChargeStatusResult,
  CreateChargeInput,
  PaymentDriver,
  WebhookEvent,
} from "./types";

const NOT_CONFIGURED =
  "2C2P driver not configured — see src/lib/payments/README.md for what a real implementation needs";

/** Skeleton implementing `PaymentDriver` — every method throws until filled
 * in. See README.md alongside this file for 2C2P's actual API docs and what
 * each method needs to do, using omise-driver.ts as the worked example. */
export class TwoCTwoPDriver implements PaymentDriver {
  async createCharge(_input: CreateChargeInput): Promise<ChargeResult> {
    throw new Error(NOT_CONFIGURED);
  }

  async getChargeStatus(_gatewayReference: string): Promise<ChargeStatusResult> {
    throw new Error(NOT_CONFIGURED);
  }

  verifyWebhookSignature(_rawBody: string, _headers: Headers): boolean {
    return false;
  }

  parseWebhookEvent(_rawBody: string): WebhookEvent | null {
    return null;
  }
}
