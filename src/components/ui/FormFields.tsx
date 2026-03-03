"use client";

import {
  Controller,
  FieldValues,
  Control,
  FieldErrors,
  FieldError,
} from "react-hook-form";
import { Input } from "./Input";
import { FieldConfig } from "./FormBuilder";

interface FormFieldsProps<T extends FieldValues = FieldValues> {
  fields: FieldConfig<T>[];
  control: Control<T>;
  errors: FieldErrors<T>;
  isLoading?: boolean;
}

export function FormFields<T extends FieldValues = FieldValues>({
  fields,
  control,
  errors,
  isLoading = false,
}: FormFieldsProps<T>) {
  return (
    <>
      {fields.map((field) => (
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
              required={!!field.rules?.required}
            />
          )}
        />
      ))}
    </>
  );
}
