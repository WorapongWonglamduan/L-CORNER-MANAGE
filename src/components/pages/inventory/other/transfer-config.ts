import type { FieldConfig } from "@/components/dynamic-form/types";
import { INPUT_TYPES } from "@/constants/input-types";
import type { TransferFormData } from "./transfer-helper";
import type { Warehouse } from "../list/helper";
import type { Locale } from "@/types/i18n";

interface TransferProduct {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
  available_quantity: number;
}

export const getTransferFormConfig = (
  t: (key: string) => string,
  products: TransferProduct[],
  destinationWarehouses: Warehouse[],
  locale: Locale,
): FieldConfig<TransferFormData>[] => [
  {
    name: "product_id",
    type: INPUT_TYPES.COMBOBOX,
    label: t("product"),
    placeholder: t("selectProduct"),
    rules: { required: t("errorRequireProduct") },
    options: products.map((p) => ({
      value: p.id,
      label: `${p.code} - ${p.name_i18n[locale]} (${t("available")}: ${p.available_quantity})`,
    })),
  },
  {
    name: "to_warehouse_id",
    type: INPUT_TYPES.SELECT,
    label: t("toWarehouse"),
    rules: { required: t("errorSameWarehouse") },
    options: destinationWarehouses.map((w) => ({
      value: w.id,
      label: `${w.code} - ${w.name_i18n[locale]}`,
    })),
  },
  {
    name: "quantity",
    type: INPUT_TYPES.NUMBER,
    label: t("quantity"),
    placeholder: "0",
    rules: {
      required: t("errorRequireQuantity"),
      min: { value: 0.0001, message: t("errorRequireQuantity") },
    },
    min: "0",
    step: "1",
  },
  {
    name: "note",
    type: INPUT_TYPES.TEXTAREA,
    label: t("noteOptional"),
    placeholder: t("notePlaceholder"),
    rows: 3,
  },
];
