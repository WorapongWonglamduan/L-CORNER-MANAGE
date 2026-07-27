"use client";

import {
  Controller,
  FieldValues,
  Control,
  FieldErrors,
  FieldError,
} from "react-hook-form";
import { renderDynamicFieldControl } from "./field-registry";
import type { FieldConfig } from "./types";

interface DynamicFormFieldsProps<T extends FieldValues = FieldValues> {
  fields: FieldConfig<T>[];
  control: Control<T>;
  errors: FieldErrors<T>;
  isLoading?: boolean;
}

export function DynamicFormFields<T extends FieldValues = FieldValues>({
  fields,
  control,
  errors,
  isLoading = false,
}: DynamicFormFieldsProps<T>) {
  return (
    <>
      {fields.map((field) => (
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
      ))}
    </>
  );
}
