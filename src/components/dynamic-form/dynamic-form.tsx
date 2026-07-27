"use client";

import {
  Controller,
  FieldValues,
  Control,
  FieldErrors,
  UseFormHandleSubmit,
  FieldError,
} from "react-hook-form";
import { theme } from "@/lib/theme";
import { renderDynamicFieldControl } from "./field-registry";
import type { FieldType, FieldConfig } from "./types";

export interface FormConfig<T extends FieldValues = FieldValues> {
  fields: FieldConfig<T>[];
  submitLabel?: string;
  loadingLabel?: string;
  className?: string;
  /** Render fields in a responsive 2-column grid instead of stacking them all in one column. */
  grid?: boolean;
}

const FULL_WIDTH_TYPES = new Set<FieldType>([
  "textarea",
  "image-upload",
  "multi-image-upload",
]);

function colSpanClass<T extends FieldValues>(field: FieldConfig<T>) {
  const span = field.colSpan ?? (FULL_WIDTH_TYPES.has(field.type) ? 2 : 1);
  return span === 2 ? "sm:col-span-2" : undefined;
}

interface DynamicFormProps<T extends FieldValues = FieldValues> {
  config: FormConfig<T>;
  control: Control<T>;
  handleSubmit: UseFormHandleSubmit<T>;
  onSubmit: (data: T) => void | Promise<void>;
  errors: FieldErrors<T>;
  error?: string;
  isLoading?: boolean;
}

export function DynamicForm<T extends FieldValues = FieldValues>({
  config,
  control,
  handleSubmit,
  onSubmit,
  errors,
  error,
  isLoading = false,
}: DynamicFormProps<T>) {
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={config.className || "space-y-5"}
    >
      {(() => {
        const fieldElements = config.fields.map((field) => (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            rules={field.rules}
            render={({ field: rhf }) =>
              renderDynamicFieldControl(field, rhf, {
                error: errors[field.name] as FieldError | undefined,
                disabled: field.disabled || isLoading,
              })
            }
          />
        ));

        if (!config.grid) return fieldElements;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.fields.map((field, index) => (
              <div key={field.name} className={colSpanClass(field)}>
                {fieldElements[index]}
              </div>
            ))}
          </div>
        );
      })()}

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
        className={`w-full ${theme.rounded.md} ${theme.buttons.primary} focus:outline-none focus:ring-2 focus:ring-[${theme.colors.primary.main}] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 p-3 cursor-pointer`}
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
