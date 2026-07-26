import { FieldConfig } from "@/components/ui/FormBuilder";
import { ToppingFormData } from "../helper";
import { INPUT_TYPES } from "@/constants/input-types";
import { I18nText, Locale } from "@/types/i18n";

export const getToppingFormConfig = (
  t: (key: string) => string,
  ingredients: Array<{ id: string; code: string; name_i18n: I18nText }>,
  locale: Locale = "th",
): FieldConfig<ToppingFormData>[] => [
  {
    name: "name_th",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameTh")}`,
    placeholder: t("nameThPlaceholder"),
    rules: { required: true },
  },
  {
    name: "name_en",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameEn")}`,
    placeholder: t("nameEnPlaceholder"),
    rules: { required: true },
  },
  {
    name: "price",
    type: INPUT_TYPES.NUMBER,
    label: t("price"),
    placeholder: t("pricePlaceholder"),
    min: "0",
    step: "0.01",
  },
  {
    name: "ingredient_id",
    type: INPUT_TYPES.SELECT,
    label: t("ingredient"),
    placeholder: t("ingredientPlaceholder"),
    rules: { required: true },
    options: ingredients.map((ingredient) => ({
      value: ingredient.id,
      label: `${ingredient.name_i18n[locale]} (${ingredient.code})`,
    })),
  },
  {
    name: "quantity_per_serving",
    type: INPUT_TYPES.NUMBER,
    label: t("quantityPerServing"),
    rules: { required: true },
    min: "0.01",
    step: "0.01",
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
