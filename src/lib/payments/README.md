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

`omise-driver.ts` and `paypal-driver.ts` are both fully worked, real
implementations — read them first.

`omise-driver.ts`:

- Calls Omise's REST API directly via `fetch` (no SDK), Basic Auth with the
  secret key.
- Converts this app's amounts (full THB, e.g. `150.5`) to Omise's smallest
  subunit (satang, `× 100`) at the boundary.
- Verifies webhooks with real HMAC-SHA256 (`Omise-Signature` /
  `Omise-Signature-Timestamp` headers) — but per Omise's own docs, still
  treats that as a pre-filter only, not the reconciliation authority.
- Handles two QR-style source methods (`"promptpay"`, `"truemoney_qr"`) with
  an identical response shape, plus `"card"` for a client-tokenized charge.

`paypal-driver.ts` — the one driver here with no in-person QR/scan flow of
its own:

- OAuth2 client-credentials grant (`POST /v1/oauth2/token`) fetched fresh on
  every call — no token caching, since call volume here is a handful a
  minute at most.
- Amounts are a decimal string in full currency units (e.g. `"150.50"`),
  unlike Omise's smallest-subunit integer.
- Uses the Orders API's own `"approve"` link (normally a web-checkout
  redirect target) as `ChargeResult.qrPayload` instead — the client renders
  its own QR code from that URL (via `react-qr-code`, same as the manual
  PromptPay flow), since PayPal doesn't hand back a pre-rendered QR image
  the way Omise does.
- `getChargeStatus` does double duty: an `APPROVED` order (payer has
  authorized but PayPal hasn't captured yet) gets captured right there,
  since that's the one function `reconcile.ts` treats as authoritative to
  act on — this mirrors Omise's model even though PayPal's own API shape is
  a create-then-capture two-step, not a single charge object.

## Filling in a stub driver

Each of `2c2p-driver.ts`, `truemoney-driver.ts`, `rabbit-linepay-driver.ts`
throws `"<Provider> not configured"` from every method. To implement one for
real:

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
- **PayPal**: already implemented — see `paypal-driver.ts` above. Orders API
  v2 (create → capture), OAuth2 client-credentials auth. Sandbox app at
  developer.paypal.com → Dashboard → Apps & Credentials → Sandbox. Note this
  is fundamentally a cross-border/e-commerce checkout flow repurposed for an
  in-person QR — settling THB into a Thai merchant's real PayPal account has
  its own restrictions outside sandbox, worth checking before relying on
  this in production.
  **Verified hitting this restriction even in sandbox**: order creation and
  the checkout redirect always succeed (confirmed directly against the API,
  bypassing this app entirely), but approving/paying as the buyer reliably
  ends at `sandbox.paypal.com/checkoutweb/genericError?code=...` with the
  base64-decoded code `COMPLIANCE_VIOLATION` — reproduced across two
  different sandbox Business accounts (one freshly created with a fully
  filled-in, "Verified" business profile), THB and USD amounts, and both a
  Thailand- and a US-country sandbox buyer account. The one constant across
  every failing attempt was a **Thailand-country sandbox Business
  (merchant) account** — this looks like PayPal's compliance engine
  faithfully simulating the real restriction on settling into Thai
  accounts, not anything fixable in this app's driver code. Untested:
  whether a non-Thailand-country Business account avoids it (would no
  longer represent this app's actual merchant, so wasn't pursued further).
- **TrueMoney**: already covered via Omise — `omise-driver.ts`'s
  `createCharge` supports `method: "truemoney_qr"` (`source: { type:
  "truemoney_qr" }`), same `source.scannable_code.image.download_uri`
  response shape as `"promptpay"`, and same limitation (not expirable via
  Omise's charge-expire endpoint — see the class-level comment in
  `omise-driver.ts`). `truemoney-driver.ts` (this stub) would only be worth
  filling in for a *direct* TrueMoney merchant-API integration — e.g. to
  reach `truemoney`/`truemoney_jumpapp` flows Omise doesn't expose, or to
  drop the Omise middleman entirely.
- **Rabbit LINE Pay**: https://pay.line.me/th/developers — LINE's own Pay
  API, separate from LINE Notify/Messaging API.
