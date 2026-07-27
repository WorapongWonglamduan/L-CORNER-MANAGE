import { FieldValues, Path, RegisterOptions, UseFormSetValue } from "react-hook-form";
import { LucideIcon } from "lucide-react";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "date"
  | "textarea"
  | "select"
  | "combobox"
  | "checkbox"
  | "image-upload"
  | "multi-image-upload";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface FieldConfig<T extends FieldValues = FieldValues> {
  name: Path<T>;
  type: FieldType;
  label?: string;
  placeholder?: string;
  helperText?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  autoComplete?: string;
  options?: SelectOption[];
  rows?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  rules?: RegisterOptions<T>;
  /** Grid column span on the `sm:grid-cols-2` layout. Defaults to 2 (full width) for textarea/image fields, 1 otherwise. */
  colSpan?: 1 | 2;
  /** One-off Tailwind override for the rendered control's own className (e.g. `py-2!` to match a neighboring Button's height) — not for layout/grid placement, use `colSpan` for that. */
  className?: string;
  /** Side-effect fired after this field's own value changes (e.g. parse a pasted map link and fill sibling lat/long fields). Requires the form's `setValue` to be threaded down to `DynamicFormFields`/`EntityDialog` — a no-op if omitted. */
  onValueChange?: (value: string, helpers: { setValue?: UseFormSetValue<T> }) => void;
}
