import { FieldConfig } from "@/components/ui/FormBuilder";
import { RawMaterialFormData } from "./helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getRawMaterialFormConfig = (
  t: (key: string) => string,
  units: Array<{ id: string; name_i18n: { th: string; en: string } }>,
  categories: Array<{ id: string; name_i18n: { th: string; en: string } }>
): FieldConfig<RawMaterialFormData>[] => [
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
    placeholder: t("nameThPlaceholder"),
    rules: { required: t("nameThRequired") },
  },
  {
    name: "name_en",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameEn")}`,
    placeholder: t("nameEnPlaceholder"),
    rules: { required: t("nameEnRequired") },
  },
  {
    name: "description_th",
    type: INPUT_TYPES.TEXTAREA,
    label: t("descriptionTh"),
    placeholder: t("descriptionThPlaceholder"),
  },
  {
    name: "description_en",
    type: INPUT_TYPES.TEXTAREA,
    label: t("descriptionEn"),
    placeholder: t("descriptionEnPlaceholder"),
  },
  {
    name: "category_id",
    type: INPUT_TYPES.SELECT,
    label: t("category"),
    placeholder: t("categoryPlaceholder"),
    options: categories.map((category) => ({
      value: category.id,
      label: `${category.name_i18n.th} (${category.name_i18n.en})`,
    })),
  },
  {
    name: "unit_id",
    type: INPUT_TYPES.SELECT,
    label: `${t("unit")}`,
    placeholder: t("unitPlaceholder"),
    rules: { required: t("unitRequired") },
    options: units.map((unit) => ({
      value: unit.id,
      label: `${unit.name_i18n.th} (${unit.name_i18n.en})`,
    })),
  },
  {
    name: "cost_price",
    type: INPUT_TYPES.NUMBER,
    label: t("costPrice"),
    placeholder: t("costPricePlaceholder"),
    rules: { min: { value: 0, message: t("costPriceMin") } },
  },
  {
    name: "min_stock",
    type: INPUT_TYPES.NUMBER,
    label: t("minStock"),
    placeholder: t("minStockPlaceholder"),
    rules: { min: { value: 0, message: t("minStockMin") } },
  },
  {
    name: "current_stock",
    type: INPUT_TYPES.NUMBER,
    label: t("currentStock"),
    placeholder: t("currentStockPlaceholder"),
    rules: { min: { value: 0, message: t("currentStockMin") } },
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
