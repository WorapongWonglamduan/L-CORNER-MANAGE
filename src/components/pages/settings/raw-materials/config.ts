import { FieldConfig } from "@/components/ui/FormBuilder";
import { RawMaterialFormData } from "./helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getRawMaterialFormConfig = (
  t: (key: string) => string,
  units: Array<{
    id: string;
    name_i18n: { th: string; en: string };
    abbreviation_i18n: { th: string; en: string };
  }>,
  productTypes: Array<{ id: string; name_i18n: { th: string; en: string } }>,
  locale: string = "th",
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
    name: "type_id",
    type: INPUT_TYPES.SELECT,
    label: t("type"),
    placeholder: t("typePlaceholder"),
    rules: { required: t("typeRequired") },
    options: productTypes.map((type) => ({
      value: type.id,
      label: type.name_i18n[locale],
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
      label: `${unit.name_i18n[locale]} (${unit.abbreviation_i18n[locale]})`,
    })),
  },
  {
    name: "cost_price",
    type: INPUT_TYPES.NUMBER,
    label: t("costPrice"),
    placeholder: t("costPricePlaceholder"),
    rules: { min: { value: 0, message: t("costPriceMin") } },
    min: "0",
    step: "0.01",
  },
  {
    name: "min_stock",
    type: INPUT_TYPES.NUMBER,
    label: t("minStock"),
    placeholder: t("minStockPlaceholder"),
    rules: { min: { value: 0, message: t("minStockMin") } },
    min: "0",
    step: "1",
  },
  {
    name: "current_stock",
    type: INPUT_TYPES.NUMBER,
    label: t("currentStock"),
    placeholder: t("currentStockPlaceholder"),
    rules: { min: { value: 0, message: t("currentStockMin") } },
    min: "0",
    step: "1",
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
