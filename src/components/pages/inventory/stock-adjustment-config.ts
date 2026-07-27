import type { FieldConfig } from "@/components/dynamic-form/types";
import { INPUT_TYPES } from "@/constants/input-types";
import { ADJUSTMENT_TYPES } from "@/constants/inventory";

export interface StockAdjustmentFormData {
  adjustmentType: string;
  quantity: string;
  reason: string;
  note: string;
}

export const getStockAdjustmentFormConfig = (
  t: (key: string) => string,
  adjustmentType: string,
): FieldConfig<StockAdjustmentFormData>[] => [
  {
    name: "quantity",
    type: INPUT_TYPES.NUMBER,
    label:
      adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
        ? t("newStockAmount")
        : adjustmentType === ADJUSTMENT_TYPES.IN
          ? t("quantityIncrease")
          : t("quantityDecrease"),
    placeholder: "0",
    rules: {
      required: "กรุณาระบุจำนวน",
      min: { value: 0, message: "จำนวนต้องมากกว่า 0" },
    },
    min: "0",
    step: "1",
  },
  {
    name: "reason",
    type: INPUT_TYPES.SELECT,
    label: t("reason"),
    placeholder: t("selectReason"),
    rules: { required: "กรุณาเลือกเหตุผล" },
    options: [
      { value: "ผลิตสินค้า", label: "ผลิตสินค้า" },
      { value: "ผลิตตามออเดอร์", label: "ผลิตตามออเดอร์" },
      { value: "ผลิตเพิ่มสต็อก", label: "ผลิตเพิ่มสต็อก" },
      { value: "รับสินค้าเข้า", label: "รับสินค้าเข้า" },
      { value: "เบิกสินค้า", label: "เบิกสินค้า" },
      { value: "สินค้าเสียหาย", label: "สินค้าเสียหาย" },
      { value: "สินค้าหมดอายุ", label: "สินค้าหมดอายุ" },
      { value: "นับสต็อกใหม่", label: "นับสต็อกใหม่" },
      { value: "อื่นๆ", label: "อื่นๆ" },
    ],
  },
  {
    name: "note",
    type: INPUT_TYPES.TEXTAREA,
    label: t("note"),
    placeholder: t("notePlaceholder"),
    rows: 3,
  },
];
