import type { FieldConfig } from "@/components/dynamic-form/types";
import { UnitFormData } from "../helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getUnitFormConfig = (
  t: (key: string) => string,
): FieldConfig<UnitFormData>[] => [
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
    name: "abbreviation_th",
    type: INPUT_TYPES.TEXT,
    label: `${t("abbreviationTh")}`,
    placeholder: t("abbreviationThPlaceholder"),
    rules: { required: t("abbreviationThRequired") },
  },
  {
    name: "abbreviation_en",
    type: INPUT_TYPES.TEXT,
    label: `${t("abbreviationEn")}`,
    placeholder: t("abbreviationEnPlaceholder"),
    rules: { required: t("abbreviationEnRequired") },
  },
  {
    name: "unit_type",
    type: INPUT_TYPES.TEXT,
    label: t("unitType"),
    placeholder: t("unitTypePlaceholder"),
  },
  {
    name: "is_base_unit",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isBaseUnit"),
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
