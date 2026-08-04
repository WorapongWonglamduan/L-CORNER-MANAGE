import type { FieldConfig } from "@/components/dynamic-form/types";
import { ShopFormData } from "../list/helper";
import { INPUT_TYPES } from "@/constants/input-types";

// Provisioning (create) needs the shop name plus its first branch and owner
// user in one form — a shop by itself with no branch/owner would be
// unusable. Editing only ever touches the shop's own name/status; the
// branch/owner were already provisioned and aren't re-editable here.
export const getShopFormConfig = (
  t: (key: string) => string,
  mode: "create" | "edit",
  shopId?: string,
): FieldConfig<ShopFormData>[] => {
  const shopFields: FieldConfig<ShopFormData>[] = [
    {
      name: "logo_path",
      type: INPUT_TYPES.IMAGE_UPLOAD,
      label: t("logo"),
      colSpan: 2,
      imageUploadFolder: "shops",
      // No entity to attach to yet on create — same pattern as products'
      // gallery upload (upload first, link afterward). On edit, entity_id
      // lets the upload endpoint's ownership check verify a re-uploaded
      // logo is being attached to this same shop.
      ...(mode === "edit" && shopId
        ? { imageUploadEntityType: "shop", imageUploadEntityId: shopId }
        : {}),
    },
    {
      name: "name_th",
      type: INPUT_TYPES.TEXT,
      label: t("nameTh"),
      placeholder: t("nameThPlaceholder"),
      rules: { required: t("nameThRequired") },
    },
    {
      name: "name_en",
      type: INPUT_TYPES.TEXT,
      label: t("nameEn"),
      placeholder: t("nameEnPlaceholder"),
      rules: { required: t("nameEnRequired") },
    },
    {
      name: "is_active",
      type: INPUT_TYPES.CHECKBOX,
      label: t("isActive"),
    },
  ];

  if (mode === "edit") return shopFields;

  return [
    ...shopFields,
    {
      name: "branch_code",
      type: INPUT_TYPES.TEXT,
      label: t("branchCode"),
      placeholder: t("branchCodePlaceholder"),
      rules: { required: t("branchCodeRequired") },
    },
    {
      name: "branch_name_th",
      type: INPUT_TYPES.TEXT,
      label: t("branchNameTh"),
      placeholder: t("branchNameThPlaceholder"),
      rules: { required: t("branchNameThRequired") },
    },
    {
      name: "branch_name_en",
      type: INPUT_TYPES.TEXT,
      label: t("branchNameEn"),
      placeholder: t("branchNameEnPlaceholder"),
      rules: { required: t("branchNameEnRequired") },
    },
    {
      name: "owner_full_name",
      type: INPUT_TYPES.TEXT,
      label: t("ownerFullName"),
      placeholder: t("ownerFullNamePlaceholder"),
      rules: { required: t("ownerFullNameRequired") },
    },
    {
      name: "owner_username",
      type: INPUT_TYPES.TEXT,
      label: t("ownerUsername"),
      placeholder: t("ownerUsernamePlaceholder"),
      rules: { required: t("ownerUsernameRequired") },
    },
    {
      name: "owner_email",
      type: INPUT_TYPES.EMAIL,
      label: t("ownerEmail"),
      placeholder: t("ownerEmailPlaceholder"),
      rules: { required: t("ownerEmailRequired") },
    },
    {
      name: "owner_password",
      type: INPUT_TYPES.PASSWORD,
      label: t("ownerPassword"),
      placeholder: t("ownerPasswordPlaceholder"),
      rules: {
        required: t("ownerPasswordRequired"),
        minLength: { value: 6, message: t("ownerPasswordMinLength") },
      },
    },
  ];
};
