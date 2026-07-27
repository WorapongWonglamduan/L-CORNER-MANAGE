import type { FieldConfig } from "@/components/dynamic-form/types";
import { WarehouseFormData } from "../helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getWarehouseFormConfig = (
  t: (key: string) => string,
): FieldConfig<WarehouseFormData>[] => [
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
    name: "address",
    type: INPUT_TYPES.TEXTAREA,
    label: t("address"),
    placeholder: t("addressPlaceholder"),
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
  {
    name: "is_default",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isDefault"),
  },
];
