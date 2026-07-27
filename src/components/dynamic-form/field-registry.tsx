"use client";

import type { ControllerRenderProps, FieldError, FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import type { FieldConfig, FieldType } from "./types";

type RHFField = ControllerRenderProps<FieldValues, string>;

interface RenderOptions {
  error?: FieldError;
  disabled?: boolean;
}

type FieldRenderer = (
  field: FieldConfig<FieldValues>,
  rhf: RHFField,
  opts: RenderOptions,
) => React.ReactElement;

// Plain text-like inputs (text/email/password/tel/url/date/number) and the
// select/textarea/image-upload types all render through the shared `Input`
// component — same field shape (single scalar value), only `inputType`
// differs. Kept as one renderer to avoid repeating the same prop list
// eleven times; combobox/checkbox get their own renderer below since their
// value/onChange shape genuinely differs (string-only vs boolean vs array).
const inputLikeField: FieldRenderer = (field, rhf, opts) => (
  <Input
    ref={rhf.ref}
    inputType={field.type}
    id={field.name}
    label={field.label}
    placeholder={field.placeholder}
    helperText={field.helperText}
    icon={field.icon}
    error={opts.error}
    value={(rhf.value as string | number) ?? ""}
    onChange={rhf.onChange}
    onBlur={rhf.onBlur}
    disabled={opts.disabled}
    autoComplete={field.autoComplete}
    options={field.options}
    rows={field.rows}
    min={field.min}
    max={field.max}
    step={field.step}
    required={!!field.rules?.required}
    className={field.className}
  />
);

const checkboxField: FieldRenderer = (field, rhf, opts) => (
  <Input
    ref={rhf.ref}
    inputType="checkbox"
    id={field.name}
    label={field.label}
    helperText={field.helperText}
    error={opts.error}
    checked={rhf.value as boolean}
    onCheckedChange={rhf.onChange}
    onBlur={rhf.onBlur}
    disabled={opts.disabled}
  />
);

const comboboxField: FieldRenderer = (field, rhf, opts) => (
  <Combobox
    ref={rhf.ref}
    id={field.name}
    label={field.label}
    placeholder={field.placeholder}
    helperText={field.helperText}
    error={opts.error}
    value={(rhf.value as string) || ""}
    onChange={rhf.onChange}
    onBlur={rhf.onBlur}
    disabled={opts.disabled}
    options={(field.options ?? []).map((o) => ({
      value: String(o.value),
      label: o.label,
    }))}
    required={!!field.rules?.required}
  />
);

// Image fields carry an `ImageFile[]`, not a scalar — Input's public prop
// type models native HTML input attrs and doesn't cover that shape (Input.tsx
// re-casts internally too), so this is the one boundary where we cast through
// unknown rather than widening Input's whole prop type for one field kind.
const imageUploadField: FieldRenderer = (field, rhf, opts) => (
  <Input
    ref={rhf.ref}
    inputType={field.type}
    id={field.name}
    label={field.label}
    helperText={field.helperText}
    error={opts.error}
    value={rhf.value as unknown as string[]}
    onChange={rhf.onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
    disabled={opts.disabled}
    required={!!field.rules?.required}
  />
);

const fieldRenderers: Record<FieldType, FieldRenderer> = {
  text: inputLikeField,
  email: inputLikeField,
  password: inputLikeField,
  number: inputLikeField,
  tel: inputLikeField,
  url: inputLikeField,
  date: inputLikeField,
  textarea: inputLikeField,
  select: inputLikeField,
  combobox: comboboxField,
  checkbox: checkboxField,
  "image-upload": imageUploadField,
  "multi-image-upload": imageUploadField,
};

export function renderDynamicFieldControl<T extends FieldValues>(
  field: FieldConfig<T>,
  rhf: RHFField,
  opts: RenderOptions = {},
): React.ReactElement {
  return fieldRenderers[field.type](field as FieldConfig<FieldValues>, rhf, opts);
}
