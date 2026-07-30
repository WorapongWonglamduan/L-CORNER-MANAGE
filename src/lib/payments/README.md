# Payment drivers

Each file implements `PaymentDriver` (`types.ts`) — one gateway, four methods:

- `createCharge(input)` — start a payment. Returns immediately with either a
  final result (a synchronous card charge) or a `pending` one with a
  `qrImageUrl`/redirect for the customer to complete.
- `getChargeStatus(gatewayReference)` — the **authoritative** check.
  `reconcile.ts` calls this before ever creating a Sale — never trust a
  webhook payload's own status field, always re-ask the gateway itself
  using your own credentials.
- `verifyWebhookSignature(rawBody, headers)` / `parseWebhookEvent(rawBody)` —
  best-effort. A webhook is only ever a *nudge to check sooner*; if a
  provider has no real signing scheme, return `false`/`null` and rely
  entirely on the poll loop (`GET /api/payments/intents/[id]`) instead.

`omise-driver.ts` is the fully worked example — read it first. It:

- Calls Omise's REST API directly via `fetch` (no SDK), Basic Auth with the
  secret key.
- Converts this app's amounts (full THB, e.g. `150.5`) to Omise's smallest
  subunit (satang, `× 100`) at the boundary.
- Verifies webhooks with real HMAC-SHA256 (`Omise-Signature` /
  `Omise-Signature-Timestamp` headers) — but per Omise's own docs, still
  treats that as a pre-filter only, not the reconciliation authority.

## Filling in a stub driver

Each of `2c2p-driver.ts`, `paypal-driver.ts`, `truemoney-driver.ts`,
`rabbit-linepay-driver.ts` throws `"<Provider> not configured"` from every
method. To implement one for real:

1. Sign up for sandbox/test credentials with that provider and add whatever
   env vars it needs (mirror `requireEnv()` in `omise-driver.ts`).
2. Implement `createCharge`/`getChargeStatus` against that provider's actual
   REST API — check their current docs, don't assume the shape matches
   Omise's.
3. Register it in `index.ts`'s `FACTORIES` map (already wired — the
   constructor is the only thing that needs filling in).
4. If the provider signs webhooks, implement real verification; if not (or
   you're not sure), leave `verifyWebhookSignature` returning `false` —
   `reconcileIntent`'s pull-based design means the poll loop alone is
   already a complete, correct integration without a working webhook.

## Provider references (as of this writing — always check current docs)

- **2C2P**: https://developer.2c2p.com — PGW API, JWT-based auth, popular
  with Thai merchants; supports cards, QR PromptPay, and various Thai
  wallets directly.
- **PayPal**: https://developer.paypal.com/docs/api/orders/v2/ — Orders API
  (create → capture), OAuth2 client-credentials auth. Best fit for
  international/e-commerce customers, not a typical in-person Thai retail
  QR flow.
- **TrueMoney**: check whether you actually need a *direct* integration —
  Omise's own `source` types include TrueMoney Wallet (`type:
  "truemoney_wallet"`), so extending `omise-driver.ts`'s `createCharge`
  with one more `else if` branch (same shape as the existing `"promptpay"`
  case) may cover this with no separate driver at all. Only build this
  file if you specifically need to bypass Omise for it.
- **Rabbit LINE Pay**: https://pay.line.me/th/developers — LINE's own Pay
  API, separate from LINE Notify/Messaging API.
