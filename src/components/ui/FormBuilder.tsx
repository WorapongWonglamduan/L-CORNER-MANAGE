"use client";

import {
  Controller,
  FieldValues,
  Path,
  Control,
  FieldErrors,
  UseFormHandleSubmit,
  FieldError,
  RegisterOptions,
} from "react-hook-form";
import { Input } from "./Input";
import { LucideIcon } from "lucide-react";
import { theme } from "@/lib/theme";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "textarea"
  | "select"
  | "checkbox";

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
}

export interface FormConfig<T extends FieldValues = FieldValues> {
  fields: FieldConfig<T>[];
  submitLabel?: string;
  loadingLabel?: string;
  className?: string;
}

interface FormBuilderProps<T extends FieldValues = FieldValues> {
  config: FormConfig<T>;
  control: Control<T>;
  handleSubmit: UseFormHandleSubmit<T>;
  onSubmit: (data: T) => void | Promise<void>;
  errors: FieldErrors<T>;
  error?: string;
  isLoading?: boolean;
}

export function FormBuilder<T extends FieldValues = FieldValues>({
  config,
  control,
  handleSubmit,
  onSubmit,
  errors,
  error,
  isLoading = false,
}: FormBuilderProps<T>) {
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={config.className || "space-y-5"}
    >
      {config.fields.map((field) => (
        <Controller
          key={field.name}
          name={field.name}
          control={control}
          rules={field.rules}
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <Input
              {...field}
              ref={ref}
              inputType={field.type}
              id={field.name}
              label={field.label}
              placeholder={field.placeholder}
              helperText={field.helperText}
              icon={field.icon}
              error={errors[field.name] as FieldError | undefined}
              value={field.type === "checkbox" ? undefined : value || ""}
              checked={field.type === "checkbox" ? value : undefined}
              onCheckedChange={field.type === "checkbox" ? onChange : undefined}
              onChange={field.type !== "checkbox" ? onChange : undefined}
              onBlur={onBlur}
              disabled={field.disabled || isLoading}
              autoComplete={field.autoComplete}
              options={field.options}
              rows={field.rows}
              min={field.min}
              max={field.max}
              step={field.step}
            />
          )}
        />
      ))}

      {error && (
        <div
          className={`${theme.rounded.md} bg-red-50 border border-red-200 p-4`}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full ${theme.rounded.md} ${theme.buttons.primary} focus:outline-none focus:ring-2 focus:ring-[${theme.colors.primary.main}] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none  p-3 cursor-pointer`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {config.loadingLabel || "กำลังโหลด..."}
          </span>
        ) : (
          config.submitLabel || "ส่งข้อมูล"
        )}
      </button>
    </form>
  );
}
