import type { FieldConfig } from "@/components/dynamic-form/types";
import { PromotionFormData } from "../list/helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getPromotionFormConfig = (
  t: (key: string) => string,
): FieldConfig<PromotionFormData>[] => [
  {
    name: "code",
    type: INPUT_TYPES.TEXT,
    label: `${t("code")}`,
    placeholder: t("codePlaceholder"),
    rules: { required: t("codeRequired") },
  },
  {
    name: "name_th",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameTh")}`,
    rules: { required: true },
  },
  {
    name: "name_en",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameEn")}`,
    rules: { required: true },
  },
  {
    name: "discount_type",
    type: INPUT_TYPES.SELECT,
    label: t("discountType"),
    rules: { required: true },
    options: [
      { value: "percentage", label: t("percentage") },
      { value: "fixed", label: t("fixed") },
    ],
  },
  {
    name: "discount_value",
    type: INPUT_TYPES.NUMBER,
    label: t("discountValue"),
    rules: { required: true },
    min: "0",
    step: "0.01",
  },
  {
    name: "max_uses",
    type: INPUT_TYPES.NUMBER,
    label: t("maxUses"),
    placeholder: t("maxUsesPlaceholder"),
    min: "1",
    step: "1",
  },
  {
    name: "expires_at",
    type: INPUT_TYPES.DATE,
    label: t("expiresAt"),
    placeholder: t("expiresAtPlaceholder"),
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
