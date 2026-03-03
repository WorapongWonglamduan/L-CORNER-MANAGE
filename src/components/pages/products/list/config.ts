import { FieldConfig } from "@/components/ui/FormBuilder";
import { ProductFormData } from "./helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getProductFormConfig = (
  t: (key: string) => string,
  units: Array<{
    id: string;
    name_i18n: { th: string; en: string };
    abbreviation_i18n: { th: string; en: string };
  }>,
  categories: Array<{ id: string; name_i18n: { th: string; en: string } }>,
  productTypes: Array<{ id: string; name_i18n: { th: string; en: string } }>,
  locale: string = "th",
): FieldConfig<ProductFormData>[] => [
  {
    name: "code",
    type: INPUT_TYPES.TEXT,
    label: `${t("code")}`,
    placeholder: t("codePlaceholder"),
    rules: { required: t("codeRequired") },
  },
  {
    name: "product_type_id",
    type: INPUT_TYPES.SELECT,
    label: `${t("productType")}`,
    rules: { required: t("productTypeRequired") },
    options: productTypes.map((type) => ({
      value: type.id,
      label: type.name_i18n[locale],
    })),
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
    name: "category_id",
    type: INPUT_TYPES.SELECT,
    label: t("category"),
    rules: { required: t("categoryRequired") },
    options: categories.map((cat) => ({
      value: cat.id,
      label: cat.name_i18n[locale],
    })),
  },
  {
    name: "base_unit_id",
    type: INPUT_TYPES.SELECT,
    label: `${t("baseUnit")}`,
    rules: { required: t("baseUnitRequired") },
    options: units.map((unit) => ({
      value: unit.id,
      label: `${unit.name_i18n[locale]} (${unit.abbreviation_i18n[locale]})`,
    })),
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
    name: "selling_price",
    type: INPUT_TYPES.NUMBER,
    label: t("sellingPrice"),
    placeholder: "0.00",
    rules: {
      required: t("sellingPriceRequired"),
      min: { value: 0, message: "ราคาต้องมากกว่าหรือเท่ากับ 0" },
    },
  },
  {
    name: "cost_price",
    type: INPUT_TYPES.NUMBER,
    label: t("costPrice"),
    placeholder: "0.00",
    rules: { min: { value: 0, message: "ราคาต้องมากกว่าหรือเท่ากับ 0" } },
  },
  {
    name: "min_stock_level",
    type: INPUT_TYPES.NUMBER,
    label: t("minStockLevel"),
    placeholder: "0",
    rules: { min: { value: 0, message: "สต็อกต้องมากกว่าหรือเท่ากับ 0" } },
  },
  {
    name: "low_stock_threshold",
    type: INPUT_TYPES.NUMBER,
    label: t("lowStockThreshold"),
    placeholder: "0",
    rules: { min: { value: 0, message: "เกณฑ์ต้องมากกว่าหรือเท่ากับ 0" } },
  },
  {
    name: "image_url",
    type: INPUT_TYPES.TEXT,
    label: t("imageUrl"),
    placeholder: "https://example.com/image.jpg",
  },
  {
    name: "track_stock",
    type: INPUT_TYPES.CHECKBOX,
    label: t("trackStock"),
  },
  {
    name: "has_serial",
    type: INPUT_TYPES.CHECKBOX,
    label: t("hasSerial"),
  },
  {
    name: "has_expiry",
    type: INPUT_TYPES.CHECKBOX,
    label: t("hasExpiry"),
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
