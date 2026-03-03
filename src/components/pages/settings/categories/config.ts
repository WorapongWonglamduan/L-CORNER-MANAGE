import { FieldConfig } from "@/components/ui/FormBuilder";
import { CategoryFormData } from "./helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getCategoryFormConfig = (
  t: (key: string) => string,
  categories: Array<{ id: string; name_i18n: { th: string; en: string } }> = [],
): FieldConfig<CategoryFormData>[] => [
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
  // {
  //   name: "parent_id",
  //   type: INPUT_TYPES.SELECT,
  //   label: `${t("parentCategory")}`,
  //   placeholder: t("parentCategoryPlaceholder"),
  //   options: [
  //     ...categories.map((cat) => ({
  //       value: cat.id,
  //       label: cat.name_i18n.th,
  //     })),
  //   ],
  // },
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
