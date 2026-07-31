// Maps a sale's stored payment_method (cash/card/qr/transfer, or the
// gateway-checkout method values from pos/checkout-modal.tsx —
// promptpay/truemoney_qr/paypal) to its sales-namespace translation key.
// Falls back to the raw value instead of throwing when a new method shows
// up before its translation does.
const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  cash: "cash",
  card: "card",
  qr: "qr",
  transfer: "transfer",
  promptpay: "promptpay",
  truemoney_qr: "truemoneyQr",
  paypal: "paypal",
};

export function getPaymentMethodLabel(
  t: (key: string) => string,
  method: string | null,
): string {
  if (!method) return "-";
  const key = PAYMENT_METHOD_LABEL_KEYS[method.toLowerCase()];
  return key ? t(key) : method;
}
