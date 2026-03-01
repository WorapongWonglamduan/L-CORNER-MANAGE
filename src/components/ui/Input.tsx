"use client";

import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { FieldError } from "react-hook-form";
import { theme } from "@/lib/theme";
import { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { INPUT_TYPES, InputType } from "@/constants/input-types";

export { INPUT_TYPES };
export type { InputType };

export interface BaseInputProps {
  label?: string;
  error?: FieldError | string;
  helperText?: string;
  icon?: LucideIcon;
  containerClassName?: string;
  inputType?: InputType;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export type InputProps = BaseInputProps &
  (
    | InputHTMLAttributes<HTMLInputElement>
    | TextareaHTMLAttributes<HTMLTextAreaElement>
    | (SelectHTMLAttributes<HTMLSelectElement> & { options?: SelectOption[] })
  ) & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  };

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  InputProps
>(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      containerClassName,
      className,
      inputType = "text",
      ...props
    },
    ref,
  ) => {
    const errorMessage = typeof error === "string" ? error : error?.message;

    const baseInputClass = `${theme.inputs.default} ${Icon ? "pl-11" : ""} ${
      errorMessage ? "border-red-500 focus:border-red-500" : ""
    } ${className || ""}`;

    const renderInput = () => {
      switch (inputType) {
        case "checkbox":
          const { checked, onCheckedChange, id } =
            props as InputHTMLAttributes<HTMLInputElement> & {
              checked?: boolean;
              onCheckedChange?: (checked: boolean) => void;
            };
          return (
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onCheckedChange?.(!checked)}
              id={id}
              className={cn(
                "peer h-5 w-5 shrink-0 rounded border-2 border-gray-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#213559] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                checked &&
                  "bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white border-[#213559]",
              )}
              data-state={checked ? "checked" : "unchecked"}
            >
              {checked && <Check className="h-4 w-4" />}
            </button>
          );

        case "textarea":
          return (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={`${baseInputClass} min-h-[100px] resize-y`}
              {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          );

        case "select":
          const selectProps =
            props as SelectHTMLAttributes<HTMLSelectElement> & {
              options?: SelectOption[];
            };
          return (
            <select
              ref={ref as React.Ref<HTMLSelectElement>}
              className={baseInputClass}
              {...selectProps}
            >
              {selectProps.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );

        case "text":
        case "email":
        case "password":
        case "number":
        case "tel":
        case "url":
        default:
          const { checked: _checked, onCheckedChange: _onCheckedChange, ...inputProps } =
            props as InputHTMLAttributes<HTMLInputElement> & {
              checked?: boolean;
              onCheckedChange?: (checked: boolean) => void;
            };
          return (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              type={inputType}
              className={baseInputClass}
              {...inputProps}
            />
          );
      }
    };

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && inputType !== "textarea" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Icon className="w-5 h-5" />
            </div>
          )}

          {renderInput()}
        </div>

        {errorMessage && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errorMessage}
          </p>
        )}

        {helperText && !errorMessage && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
