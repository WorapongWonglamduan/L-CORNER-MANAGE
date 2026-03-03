export const productTypes = [
  { value: "semi_finished", label: "แบบปรุง", icon: "🥬" },
  { value: "finished_good", label: "สำเร็จรูป", icon: "🍱" },
];

interface Category {
  id: string;
  name_i18n: { th: string; en: string };
}

interface Unit {
  id: string;
  name_i18n: { th: string; en: string };
  abbreviation_i18n: { th: string; en: string };
}

import { FieldConfig } from "@/components/ui/FormBuilder";
import { RegisterOptions } from "react-hook-form";
import { ProductFormData } from "./helper";

export interface ProductFormField extends Omit<FieldConfig, 'name' | 'rules'> {
  name: string;
  rules?: RegisterOptions<ProductFormData>;
  gridCols?: string;
}

export const getProductFormConfig = (
  categories: Category[],
  units: Unit[],
  t: (key: string) => string,
): ProductFormField[] => [
  {
    name: "code",
    label: t("code"),
    type: "text",
    placeholder: t("codePlaceholder"),
    rules: { required: t("codeRequired") },
  },
  {
    name: "product_type",
    label: t("productType"),
    type: "select",
    rules: { required: t("productTypeRequired") },
    options: productTypes.map((type) => ({
      value: type.value,
      label: `${type.icon} ${type.label}`,
    })),
  },
  {
    name: "name_th",
    label: t("nameTh"),
    type: "text",
    placeholder: t("nameThPlaceholder"),
    rules: { required: t("nameThRequired") },
  },
  {
    name: "name_en",
    label: t("nameEn"),
    type: "text",
    placeholder: t("nameEnPlaceholder"),
    rules: { required: t("nameEnRequired") },
  },
  {
    name: "category_id",
    label: t("category"),
    type: "select",
    options: [
      { value: "", label: `-- ${t("category")} --` },
      ...categories.map((cat) => ({
        value: cat.id,
        label: cat.name_i18n.th,
      })),
    ],
  },
  {
    name: "base_unit_id",
    label: t("baseUnit"),
    type: "select",
    rules: { required: t("baseUnitRequired") },
    options: [
      { value: "", label: `-- ${t("baseUnit")} --` },
      ...units.map((unit) => ({
        value: unit.id,
        label: `${unit.name_i18n.th} (${unit.abbreviation_i18n.th})`,
      })),
    ],
  },
  {
    name: "description_th",
    label: t("descriptionTh"),
    type: "textarea",
    placeholder: t("descriptionThPlaceholder"),
    rows: 3,
    gridCols: "md:col-span-2",
  },
  {
    name: "image_url",
    label: t("imageUrl"),
    type: "text",
    placeholder: "https://example.com/image.jpg",
    gridCols: "md:col-span-2",
  },
];

export const getPriceStockConfig = (t: (key: string) => string): ProductFormField[] => [
  {
    name: "selling_price",
    label: t("sellingPrice"),
    type: "number",
    placeholder: "0.00",
    rules: {
      required: t("sellingPriceRequired"),
      min: { value: 0, message: "ราคาต้องมากกว่า 0" },
    },
  },
  {
    name: "cost_price",
    label: t("costPrice"),
    type: "number",
    placeholder: "0.00",
  },
  {
    name: "min_stock_level",
    label: t("minStock"),
    type: "number",
    placeholder: "0",
  },
  {
    name: "low_stock_threshold",
    label: t("lowStockAlert"),
    type: "number",
    placeholder: "0",
  },
];

export const getSettingsConfig = (t: (key: string) => string): ProductFormField[] => [
  {
    name: "track_stock",
    label: t("trackStock"),
    type: "checkbox",
  },
  {
    name: "has_serial",
    label: t("hasSerial"),
    type: "checkbox",
  },
  {
    name: "has_expiry",
    label: t("hasExpiry"),
    type: "checkbox",
  },
  {
    name: "is_active",
    label: t("isActive"),
    type: "checkbox",
  },
];
