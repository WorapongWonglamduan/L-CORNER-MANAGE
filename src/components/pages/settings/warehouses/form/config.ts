import type { FieldConfig } from "@/components/dynamic-form/types";
import { WarehouseFormData } from "../helper";
import { INPUT_TYPES } from "@/constants/input-types";
import { isMapsShortLink, parseMapsLink } from "@/lib/parse-maps-link";
import { toast } from "@/lib/toast";

export const getWarehouseFormConfig = (
  t: (key: string) => string,
): FieldConfig<WarehouseFormData>[] => [
  {
    name: "code",
    type: INPUT_TYPES.TEXT,
    label: `${t("code")}`,
    placeholder: t("codePlaceholder"),
    rules: { required: t("codeRequired") },
  },
  {
    name: "name_th",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameTh")}`,
    rules: { required: true },
  },
  {
    name: "name_en",
    type: INPUT_TYPES.TEXT,
    label: `${t("nameEn")}`,
    rules: { required: true },
  },
  {
    name: "address",
    type: INPUT_TYPES.TEXTAREA,
    label: t("address"),
    placeholder: t("addressPlaceholder"),
  },
  {
    name: "mapLink",
    type: INPUT_TYPES.TEXT,
    label: t("mapLink"),
    placeholder: t("mapLinkPlaceholder"),
    helperText: t("mapLinkHelper"),
    colSpan: 2,
    onValueChange: (value, { setValue }) => {
      if (!value || !setValue) return;

      const parsed = parseMapsLink(value);
      if (parsed) {
        setValue("latitude", String(parsed.latitude));
        setValue("longitude", String(parsed.longitude));
        toast.success(t("mapLinkResolved"));
        return;
      }

      if (isMapsShortLink(value)) {
        toast.info(t("mapLinkResolving"));
        fetch("/api/warehouses/resolve-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        })
          .then(async (res) => (res.ok ? res.json() : Promise.reject(await res.json())))
          .then((coords) => {
            setValue("latitude", String(coords.latitude));
            setValue("longitude", String(coords.longitude));
            toast.success(t("mapLinkResolved"));
          })
          .catch(() => {
            toast.error(t("mapLinkResolveError"));
          });
        return;
      }

      // Doesn't look like a Google Maps link at all (not a recognized full
      // URL, not a known short-link host) — likely still mid-paste/typing,
      // so stay quiet rather than erroring on every keystroke.
    },
  },
  {
    name: "latitude",
    type: INPUT_TYPES.NUMBER,
    label: t("latitude"),
    placeholder: "13.7563",
    step: "any",
  },
  {
    name: "longitude",
    type: INPUT_TYPES.NUMBER,
    label: t("longitude"),
    placeholder: "100.5018",
    step: "any",
  },
  {
    name: "is_active",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isActive"),
  },
  {
    name: "is_default",
    type: INPUT_TYPES.CHECKBOX,
    label: t("isDefault"),
  },
];
