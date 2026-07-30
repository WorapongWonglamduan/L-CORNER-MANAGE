import type { FieldConfig } from "@/components/dynamic-form/types";
import { IngredientContainerFormData } from "../list/helper";
import { INPUT_TYPES } from "@/constants/input-types";
import { I18nText, Locale } from "@/types/i18n";

export const getIngredientContainerFormConfig = (
  t: (key: string) => string,
  units: Array<{
    id: string;
    name_i18n: I18nText;
    abbreviation_i18n: I18nText;
  }>,
  productTypes: Array<{ id: string; name_i18n: I18nText }>,
  locale: Locale = "th",
): FieldConfig<IngredientContainerFormData>[] => [
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
    name: "images",
    type: INPUT_TYPES.MULTI_IMAGE_UPLOAD,
    label: t("images"),
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
