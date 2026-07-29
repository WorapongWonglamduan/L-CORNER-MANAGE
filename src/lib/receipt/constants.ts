import type { PaperWidth } from "./types";

// Print resolution assumed by these cheap thermal printers (203dpi is the
// near-universal standard for 58mm/80mm clone hardware).
export const PAPER_WIDTH_PX: Record<PaperWidth, number> = {
  "58": 384,
  "80": 576,
};

export const RECEIPT_FONT_FAMILY = '"Noto Sans Thai", "Sarabun", sans-serif';
export const RECEIPT_PADDING_PX = 16;
export const RECEIPT_LINE_HEIGHT_PX = 26;
export const RECEIPT_TITLE_FONT_SIZE_PX = 22;
export const RECEIPT_BODY_FONT_SIZE_PX = 18;
export const RECEIPT_SMALL_FONT_SIZE_PX = 15;
