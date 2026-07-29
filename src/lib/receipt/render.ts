import {
  PAPER_WIDTH_PX,
  RECEIPT_FONT_FAMILY,
  RECEIPT_PADDING_PX,
  RECEIPT_LINE_HEIGHT_PX,
  RECEIPT_TITLE_FONT_SIZE_PX,
  RECEIPT_BODY_FONT_SIZE_PX,
  RECEIPT_SMALL_FONT_SIZE_PX,
} from "./constants";
import { concatBytes, initPrinter, rasterImage, feedAndCut } from "./escpos";
import type { PaperWidth, ReceiptSale } from "./types";

// Receipt-only labels. Deliberately not routed through next-intl: this is a
// printed artifact, not a rendered UI screen, and the receipt only ever
// needs these two locales regardless of which locale the printer-agent page
// itself is running in.
const LABELS = {
  th: {
    receiptTitle: "ใบเสร็จรับเงิน",
    subtotal: "รวม",
    discount: "ส่วนลด",
    tax: "ภาษี",
    total: "ยอดสุทธิ",
    payment: "ชำระโดย",
    promotion: "โปรโมชั่น",
    thankYou: "ขอบคุณที่ใช้บริการ",
    paymentMethods: { cash: "เงินสด", card: "บัตร", qr: "พร้อมเพย์" } as Record<
      string,
      string
    >,
  },
  en: {
    receiptTitle: "Receipt",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    total: "Total",
    payment: "Payment",
    promotion: "Promotion",
    thankYou: "Thank you",
    paymentMethods: { cash: "Cash", card: "Card", qr: "PromptPay" } as Record<
      string,
      string
    >,
  },
};

type Locale = "th" | "en";

function localized(names: Record<string, string>, locale: Locale): string {
  return names[locale] ?? names.th ?? Object.values(names)[0] ?? "";
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : parseFloat(value);
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

export interface RenderReceiptOptions {
  paperWidth: PaperWidth;
  locale: Locale;
}

export interface RenderedReceipt {
  widthPx: number;
  heightPx: number;
  bytes: Uint8Array;
  previewDataUrl: string;
}

// Renders a sale to a 1-bit raster image and packs it into ESC/POS bytes.
// Runs entirely through the browser's own canvas text layout, which renders
// Thai correctly — the whole reason this goes through an image instead of
// raw ESC/POS text commands (see plan doc: cheap clone printers don't
// reliably support a Thai codepage in text mode).
export function renderReceiptToRaster(
  sale: ReceiptSale,
  options: RenderReceiptOptions,
): RenderedReceipt {
  const width = PAPER_WIDTH_PX[options.paperWidth];
  const labels = LABELS[options.locale];
  const contentWidth = width - RECEIPT_PADDING_PX * 2;

  // Generous upper-bound height; only the rows actually drawn (cursorY) are
  // read back at the end, so overestimating here just wastes a bit of
  // scratch canvas memory, not print output.
  const maxHeight =
    400 +
    sale.items.length * 90 +
    sale.items.reduce((sum, item) => sum + item.toppings.length, 0) * 30;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = maxHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, maxHeight);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";

  let y = RECEIPT_PADDING_PX;

  const drawCentered = (text: string, size: number, bold = false) => {
    ctx.font = `${bold ? "bold " : ""}${size}px ${RECEIPT_FONT_FAMILY}`;
    const lineWidth = ctx.measureText(text).width;
    ctx.fillText(text, (width - lineWidth) / 2, y);
    y += size + 6;
  };

  const drawWrapped = (text: string, size: number, bold = false) => {
    ctx.font = `${bold ? "bold " : ""}${size}px ${RECEIPT_FONT_FAMILY}`;
    for (const line of wrapText(ctx, text, contentWidth)) {
      ctx.fillText(line, RECEIPT_PADDING_PX, y);
      y += size + 4;
    }
  };

  const drawRow = (
    left: string,
    right: string,
    size = RECEIPT_BODY_FONT_SIZE_PX,
    bold = false,
  ) => {
    ctx.font = `${bold ? "bold " : ""}${size}px ${RECEIPT_FONT_FAMILY}`;
    ctx.fillText(left, RECEIPT_PADDING_PX, y);
    const rightWidth = ctx.measureText(right).width;
    ctx.fillText(right, width - RECEIPT_PADDING_PX - rightWidth, y);
    y += size + 6;
  };

  const drawDivider = () => {
    y += 4;
    ctx.font = `${RECEIPT_SMALL_FONT_SIZE_PX}px ${RECEIPT_FONT_FAMILY}`;
    const dashWidth = ctx.measureText("-").width || 6;
    const dash = "-".repeat(Math.max(1, Math.floor(contentWidth / dashWidth)));
    ctx.fillText(dash, RECEIPT_PADDING_PX, y);
    y += RECEIPT_SMALL_FONT_SIZE_PX + 6;
  };

  // Header
  drawCentered(localized(sale.warehouse.name_i18n, options.locale), RECEIPT_TITLE_FONT_SIZE_PX, true);
  if (sale.warehouse.address) {
    drawCentered(sale.warehouse.address, RECEIPT_SMALL_FONT_SIZE_PX);
  }
  drawCentered(labels.receiptTitle, RECEIPT_SMALL_FONT_SIZE_PX);
  drawDivider();

  drawRow(sale.sale_number, new Date(sale.sale_date).toLocaleString(options.locale));
  drawDivider();

  // Line items
  for (const item of sale.items) {
    const name = localized(item.product.name_i18n, options.locale);
    const qty = toNumber(item.quantity);
    const total = toNumber(item.total_amount);
    drawWrapped(name, RECEIPT_BODY_FONT_SIZE_PX);
    drawRow(
      `  x${qty} @ ${formatMoney(toNumber(item.unit_price))}`,
      formatMoney(total),
      RECEIPT_SMALL_FONT_SIZE_PX,
    );
    for (const topping of item.toppings) {
      drawRow(
        `    + ${localized(topping.topping.name_i18n, options.locale)}`,
        formatMoney(toNumber(topping.unit_price) * toNumber(topping.quantity)),
        RECEIPT_SMALL_FONT_SIZE_PX,
      );
    }
  }
  drawDivider();

  // Totals
  drawRow(labels.subtotal, formatMoney(toNumber(sale.subtotal)));
  if (toNumber(sale.discount_amount) > 0) {
    drawRow(labels.discount, `-${formatMoney(toNumber(sale.discount_amount))}`);
  }
  if (toNumber(sale.tax_amount) > 0) {
    drawRow(labels.tax, formatMoney(toNumber(sale.tax_amount)));
  }
  drawRow(
    labels.total,
    formatMoney(toNumber(sale.total_amount)),
    RECEIPT_BODY_FONT_SIZE_PX + 2,
    true,
  );
  if (sale.promotion_code) {
    drawRow(labels.promotion, sale.promotion_code, RECEIPT_SMALL_FONT_SIZE_PX);
  }
  drawRow(
    labels.payment,
    labels.paymentMethods[sale.payment_method ?? ""] ?? sale.payment_method ?? "-",
    RECEIPT_SMALL_FONT_SIZE_PX,
  );

  drawDivider();
  y += 6;
  drawCentered(labels.thankYou, RECEIPT_BODY_FONT_SIZE_PX);
  y += RECEIPT_LINE_HEIGHT_PX;

  const heightPx = Math.min(y, maxHeight);
  const imageData = ctx.getImageData(0, 0, width, heightPx);
  const packedBits = toPackedBits(imageData, width, heightPx);

  const bytes = concatBytes(
    initPrinter(),
    rasterImage(width, heightPx, packedBits),
    feedAndCut(),
  );

  // Cropped to the actually-used height (unlike the scratch canvas above,
  // which is padded to maxHeight) so a mock/no-hardware run can visually
  // verify layout and Thai text wrapping without a physical printer.
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = width;
  cropCanvas.height = heightPx;
  const cropCtx = cropCanvas.getContext("2d");
  cropCtx?.putImageData(imageData, 0, 0);
  const previewDataUrl = cropCanvas.toDataURL("image/png");

  return { widthPx: width, heightPx, bytes, previewDataUrl };
}

// Hard luminance threshold (no dithering): dithering would blur the edges
// of Thai glyphs, which are already the highest-risk part of this feature.
function toPackedBits(
  imageData: ImageData,
  width: number,
  height: number,
): Uint8Array {
  const bytesPerRow = Math.ceil(width / 8);
  const out = new Uint8Array(bytesPerRow * height);
  const { data } = imageData;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const pixelIndex = (row * width + col) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128) {
        const byteIndex = row * bytesPerRow + (col >> 3);
        out[byteIndex] |= 0x80 >> col % 8;
      }
    }
  }
  return out;
}
