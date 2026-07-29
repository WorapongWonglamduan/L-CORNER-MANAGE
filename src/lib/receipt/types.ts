// Wire-shape types for the sale payload used to render a receipt. Deliberately
// not the Prisma `Sale` type: this data crosses `fetch`/SSE as JSON, where
// Decimal fields arrive as string or number depending on serialization path,
// and printing must work from either the checkout response or a replayed
// print job payload.
export interface ReceiptWarehouse {
  code: string;
  name_i18n: Record<string, string>;
  address: string | null;
}

export interface ReceiptTopping {
  quantity: number | string;
  unit_price: number | string;
  topping: { name_i18n: Record<string, string> };
}

export interface ReceiptItem {
  quantity: number | string;
  unit_price: number | string;
  total_amount: number | string;
  product: { name_i18n: Record<string, string> };
  toppings: ReceiptTopping[];
}

export interface ReceiptSale {
  sale_number: string;
  sale_date: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  payment_method: string | null;
  promotion_code: string | null;
  warehouse: ReceiptWarehouse;
  items: ReceiptItem[];
}

export type PaperWidth = "58" | "80";
