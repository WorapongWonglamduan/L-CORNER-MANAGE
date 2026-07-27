"use client";

import {
  Controller,
  FieldValues,
  Control,
  FieldErrors,
  FieldError,
  UseFormSetValue,
} from "react-hook-form";
import { renderDynamicFieldControl } from "./field-registry";
import type { FieldConfig } from "./types";

interface DynamicFormFieldsProps<T extends FieldValues = FieldValues> {
  fields: FieldConfig<T>[];
  control: Control<T>;
  errors: FieldErrors<T>;
  isLoading?: boolean;
  /** Threaded down to fields' `onValueChange` so one field can set sibling fields' values. Omit if no field in this render needs it. */
  setValue?: UseFormSetValue<T>;
}

export function DynamicFormFields<T extends FieldValues = FieldValues>({
  fields,
  control,
  errors,
  isLoading = false,
  setValue,
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
              setValue: setValue as UseFormSetValue<FieldValues> | undefined,
            })
          }
        />
      ))}
    </>
  );
}
