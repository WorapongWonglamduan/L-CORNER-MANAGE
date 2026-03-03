export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  PARTIAL: "partial",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
