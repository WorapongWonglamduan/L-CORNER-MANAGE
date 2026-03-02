import { FieldConfig } from "@/components/ui/FormBuilder";
import { RawMaterialCategoryFormData } from "./helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getRawMaterialCategoryFormConfig = (
  t: (key: string) => string
): FieldConfig<RawMaterialCategoryFormData>[] => [
  {
    name: "code",
    type: INPUT_TYPES.TEXT,
    label: `${t("code")} *`,
    placeholder: t("codePlaceholder"),
    rules: { required: t("codeRequired") },
  },
  {
    name: "name_th",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameTh")} *`,
    placeholder: t("nameThPlaceholder"),
    rules: { required: t("nameThRequired") },
  },
  {
    name: "name_en",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameEn")} *`,
    placeholder: t("nameEnPlaceholder"),
    rules: { required: t("nameEnRequired") },
  },
  {
    name: "type",
    type: INPUT_TYPES.SELECT,
    label: `${t("type")} *`,
    placeholder: t("typePlaceholder"),
    rules: { required: t("typeRequired") },
    options: [
      { value: "raw_material", label: t("typeRawMaterial") },
      { value: "product", label: t("typeProduct") },
    ],
  },
  {
    name: "sort_order",
    type: INPUT_TYPES.NUMBER,
    label: t("sortOrder"),
    placeholder: t("sortOrderPlaceholder"),
    rules: { min: { value: 0, message: t("sortOrderMin") } },
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
