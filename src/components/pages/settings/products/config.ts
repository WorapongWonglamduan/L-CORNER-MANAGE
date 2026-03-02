import { FieldConfig } from "@/components/ui/FormBuilder";
import { INPUT_TYPES } from "@/components/ui/Input";
import { ProductFormData } from "./helper";

export const getProductFormConfig = (
  t: (key: string) => string,
  units: Array<{ id: string; name_i18n: { th: string; en: string }; abbreviation_i18n: { th: string; en: string } }>,
  categories: Array<{ id: string; name_i18n: { th: string; en: string } }>,
): FieldConfig<ProductFormData>[] => {
  const productTypes = [
    { value: "finished_good", label: "สินค้าสำเร็จรูป (Finished Good)" },
    { value: "raw_material", label: "วัตถุดิบ (Raw Material)" },
    { value: "semi_finished", label: "สินค้ากึ่งสำเร็จรูป (Semi-Finished)" },
    { value: "service", label: "บริการ (Service)" },
  ];

  return [
    {
      name: "code",
      type: INPUT_TYPES.TEXT,
      label: t("code"),
      placeholder: t("codePlaceholder") || "เช่น P001",
      rules: { required: t("codeRequired") || "กรุณากรอกรหัสสินค้า" },
    },
    {
      name: "product_type",
      type: INPUT_TYPES.SELECT,
      label: t("productType"),
      options: productTypes,
      rules: { required: t("productTypeRequired") || "กรุณาเลือกประเภทสินค้า" },
    },
    {
      name: "name_th",
      type: INPUT_TYPES.TEXT,
      label: t("nameTh"),
      placeholder: t("nameThPlaceholder") || "ชื่อสินค้าภาษาไทย",
      rules: { required: t("nameThRequired") || "กรุณากรอกชื่อภาษาไทย" },
    },
    {
      name: "name_en",
      type: INPUT_TYPES.TEXT,
      label: t("nameEn"),
      placeholder: t("nameEnPlaceholder") || "Product name in English",
      rules: { required: t("nameEnRequired") || "กรุณากรอกชื่อภาษาอังกฤษ" },
    },
    {
      name: "description_th",
      type: INPUT_TYPES.TEXTAREA,
      label: t("descriptionTh"),
      placeholder: t("descriptionThPlaceholder") || "คำอธิบายภาษาไทย",
      rows: 3,
    },
    {
      name: "description_en",
      type: INPUT_TYPES.TEXTAREA,
      label: t("descriptionEn"),
      placeholder: t("descriptionEnPlaceholder") || "Description in English",
      rows: 3,
    },
    {
      name: "category_id",
      type: INPUT_TYPES.SELECT,
      label: t("category"),
      options: [
        { value: "", label: "-- เลือกหมวดหมู่ --" },
        ...categories.map((cat) => ({
          value: cat.id,
          label: cat.name_i18n.th,
        })),
      ],
    },
    {
      name: "base_unit_id",
      type: INPUT_TYPES.SELECT,
      label: t("baseUnit"),
      options: [
        { value: "", label: "-- เลือกหน่วย --" },
        ...units.map((unit) => ({
          value: unit.id,
          label: `${unit.name_i18n.th} (${unit.abbreviation_i18n.th})`,
        })),
      ],
      rules: { required: t("baseUnitRequired") || "กรุณาเลือกหน่วยพื้นฐาน" },
    },
    {
      name: "min_stock_level",
      type: INPUT_TYPES.NUMBER,
      label: t("minStockLevel"),
      placeholder: "0",
    },
    {
      name: "low_stock_threshold",
      type: INPUT_TYPES.NUMBER,
      label: t("lowStockThreshold"),
      placeholder: "0",
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
};
