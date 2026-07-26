interface Category {
  id: string;
  name_i18n: I18nText;
}

interface Unit {
  id: string;
  name_i18n: I18nText;
  abbreviation_i18n: I18nText;
}

interface ProductType {
  id: string;
  code: string;
  name_i18n: I18nText;
}

import { FieldConfig } from "@/components/ui/FormBuilder";
import { RegisterOptions } from "react-hook-form";
import { ProductFormData } from "./helper";
import { INPUT_TYPES } from "@/constants/input-types";
import { I18nText, Locale } from "@/types/i18n";

export interface ProductFormField extends Omit<FieldConfig, "name" | "rules"> {
  name: string;
  rules?: RegisterOptions<ProductFormData>;
  gridCols?: string;
}

export const getProductFormConfig = (
  categories: Category[],
  units: Unit[],
  productsTypes: ProductType[],
  t: (key: string) => string,
  locale: Locale = "th",
): ProductFormField[] => [
  {
    name: "code",
    label: t("code"),
    type: INPUT_TYPES.TEXT,
    placeholder: t("codePlaceholder"),
    rules: { required: t("codeRequired") },
  },
  {
    name: "product_type_id",
    label: t("productType"),
    type: INPUT_TYPES.SELECT,
    rules: { required: t("productTypeRequired") },
    options: [
      ...productsTypes.map((type) => ({
        value: type.id,
        label: `${type.name_i18n[locale]}`,
      })),
    ],
  },
  {
    name: "name_th",
    label: t("nameTh"),
    type: INPUT_TYPES.TEXT,
    placeholder: t("nameThPlaceholder"),
    rules: { required: t("nameThRequired") },
  },
  {
    name: "name_en",
    label: t("nameEn"),
    type: INPUT_TYPES.TEXT,
    placeholder: t("nameEnPlaceholder"),
    rules: { required: t("nameEnRequired") },
  },
  {
    name: "category_id",
    label: t("category"),
    type: INPUT_TYPES.SELECT,
    rules: { required: t("categoryRequired") },
    options: [
      ...categories.map((cat) => ({
        value: cat.id,
        label: `${cat.name_i18n[locale]}`,
      })),
    ],
  },
  {
    name: "base_unit_id",
    label: t("baseUnit"),
    type: INPUT_TYPES.SELECT,
    rules: { required: t("baseUnitRequired") },
    options: [
      ...units.map((unit) => ({
        value: unit.id,
        label: `${unit.name_i18n[locale]} (${unit.abbreviation_i18n[locale]})`,
      })),
    ],
  },
  {
    name: "description_th",
    label: t("descriptionTh"),
    type: INPUT_TYPES.TEXTAREA,
    placeholder: t("descriptionThPlaceholder"),
    rows: 3,
    gridCols: "md:col-span-2",
  },
  {
    name: "images",
    label: t("images"),
    type: INPUT_TYPES.MULTI_IMAGE_UPLOAD,
    gridCols: "md:col-span-2",
  },
];

export const getPriceStockConfig = (
  t: (key: string) => string,
): ProductFormField[] => [
  {
    name: "selling_price",
    label: t("sellingPrice"),
    type: INPUT_TYPES.NUMBER,
    placeholder: "0.00",
    rules: {
      required: t("sellingPriceRequired"),
      min: { value: 0, message: "ราคาต้องมากกว่า 0" },
    },
    min: "0",
    step: "0.01",
  },
  {
    name: "cost_price",
    label: t("costPrice"),
    type: INPUT_TYPES.NUMBER,
    placeholder: "0.00",
    min: "0",
    step: "0.01",
  },
  {
    name: "min_stock_level",
    label: t("minStock"),
    type: INPUT_TYPES.NUMBER,
    placeholder: "0",
    min: "0",
    step: "1",
  },
  {
    name: "current_stock",
    label: t("currentStock"),
    type: INPUT_TYPES.NUMBER,
    placeholder: "0",
    min: "0",
    step: "1",
  },
  // {
  //   name: "low_stock_threshold",
  //   label: t("lowStockAlert"),
  //   type: INPUT_TYPES.NUMBER,
  //   placeholder: "0",
  // },
];

export const getSettingsConfig = (
  t: (key: string) => string,
): ProductFormField[] => [
  {
    name: "track_stock",
    label: t("trackStock"),
    type: INPUT_TYPES.CHECKBOX,
  },
  {
    name: "has_serial",
    label: t("hasSerial"),
    type: INPUT_TYPES.CHECKBOX,
  },
  {
    name: "has_expiry",
    label: t("hasExpiry"),
    type: INPUT_TYPES.CHECKBOX,
  },
  {
    name: "is_active",
    label: t("isActive"),
    type: INPUT_TYPES.CHECKBOX,
  },
];
