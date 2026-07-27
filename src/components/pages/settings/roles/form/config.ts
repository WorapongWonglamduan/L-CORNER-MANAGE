import type { FieldConfig } from "@/components/dynamic-form/types";
import { RoleFormData } from "../helper";
import { INPUT_TYPES } from "@/constants/input-types";

/**
 * FieldConfig for the "simple" role fields, rendered via `FormFields` inside
 * a custom dialog in `roles-manager.tsx`. The `permissions: string[]` field
 * is NOT part of this list — FormBuilder has no multi-checkbox FieldConfig
 * type, so it's rendered separately with a hand-built checkbox grid grouped
 * by resource (see roles-manager.tsx).
 */
export const getRoleFormConfig = (
  t: (key: string) => string,
  isSystem: boolean,
): FieldConfig<RoleFormData>[] => [
  {
    name: "name",
    type: INPUT_TYPES.TEXT,
    label: t("name"),
    placeholder: t("namePlaceholder"),
    rules: { required: t("nameRequired") },
    disabled: isSystem,
    helperText: isSystem ? t("systemRole") : undefined,
  },
  {
    name: "display_name_th",
    type: INPUT_TYPES.TEXT,
    label: t("displayNameTh"),
  },
  {
    name: "display_name_en",
    type: INPUT_TYPES.TEXT,
    label: t("displayNameEn"),
  },
  {
    name: "description_th",
    type: INPUT_TYPES.TEXTAREA,
    label: t("descriptionTh"),
  },
  {
    name: "description_en",
    type: INPUT_TYPES.TEXTAREA,
    label: t("descriptionEn"),
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
