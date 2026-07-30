import type { FieldConfig } from "@/components/dynamic-form/types";
import { UserFormData } from "../list/helper";
import { INPUT_TYPES } from "@/constants/input-types";

export const getUserFormConfig = (
  t: (key: string) => string,
  isEditing: boolean,
): FieldConfig<UserFormData>[] => [
  {
    name: "username",
    type: INPUT_TYPES.TEXT,
    label: t("username"),
    placeholder: t("usernamePlaceholder"),
    rules: { required: t("usernameRequired") },
  },
  {
    name: "email",
    type: INPUT_TYPES.EMAIL,
    label: t("email"),
    placeholder: t("emailPlaceholder"),
    rules: { required: t("emailRequired") },
  },
  {
    name: "password",
    type: INPUT_TYPES.PASSWORD,
    label: t("password"),
    placeholder: t("passwordPlaceholder"),
    // Not marked `required` here on purpose: this single FieldConfig array is
    // shared between create and edit. On create the server enforces the
    // requirement (400 surfaced via the dialog's formError banner); on edit,
    // leaving it blank keeps the existing password untouched.
    helperText: isEditing ? t("passwordHintEdit") : undefined,
  },
  {
    name: "full_name",
    type: INPUT_TYPES.TEXT,
    label: t("fullName"),
    placeholder: t("fullNamePlaceholder"),
    rules: { required: t("fullNameRequired") },
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
];
