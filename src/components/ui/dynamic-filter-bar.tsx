"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Search, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface FilterFieldOption {
  label: string;
  value: string;
}

interface FilterFieldBase {
  name: string;
  label?: string;
  placeholder?: string;
  /** Rendered inside the collapsible "Advanced" section instead of the basic row. */
  advanced?: boolean;
}

export interface FilterTextField extends FilterFieldBase {
  type: "text";
}

export interface FilterSelectField extends FilterFieldBase {
  type: "select";
  options: FilterFieldOption[];
}

export interface FilterDateRangeField extends FilterFieldBase {
  type: "date-range";
}

export type FilterFieldConfig =
  | FilterTextField
  | FilterSelectField
  | FilterDateRangeField;

export type FilterValues = Record<string, string>;

interface DynamicFilterBarProps {
  fields: FilterFieldConfig[];
  values?: FilterValues;
  onApply: (values: FilterValues) => void;
  onReset?: () => void;
  searchLabel?: string;
  resetLabel?: string;
  advancedLabel?: string;
  className?: string;
}

function emptyValues(fields: FilterFieldConfig[]): FilterValues {
  const result: FilterValues = {};
  for (const field of fields) {
    if (field.type === "date-range") {
      result[`${field.name}From`] = "";
      result[`${field.name}To`] = "";
    } else {
      result[field.name] = "";
    }
  }
  return result;
}

export function DynamicFilterBar({
  fields,
  values,
  onApply,
  onReset,
  searchLabel = "ค้นหา",
  resetLabel = "ล้างค่า",
  advancedLabel = "ตัวกรองเพิ่มเติม",
  className,
}: DynamicFilterBarProps) {
  const basicFields = fields.filter((field) => !field.advanced);
  const advancedFields = fields.filter((field) => field.advanced);
  const activeFilterCount = Object.values(values ?? {}).filter(
    (value) => value !== "" && value !== undefined,
  ).length;

  const { watch, setValue, reset } = useForm<FilterValues>({
    defaultValues: { ...emptyValues(fields), ...values },
  });
  const draft = watch();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const setField = (name: string, value: string) => setValue(name, value);

  const handleSearch = () => onApply(draft);

  const handleReset = () => {
    const cleared = emptyValues(fields);
    reset(cleared);
    if (onReset) onReset();
    else onApply(cleared);
  };

  const renderField = (field: FilterFieldConfig) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            inputType={INPUT_TYPES.TEXT}
            placeholder={field.placeholder}
            value={draft[field.name] ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setField(field.name, e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === "Enter" && handleSearch()
            }
          />
        );
      case "select":
        return (
          <Input
            inputType={INPUT_TYPES.SELECT}
            value={draft[field.name] ?? ""}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setField(field.name, e.target.value)
            }
            options={field.options.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        );
      case "date-range":
        return (
          <Input
            inputType={INPUT_TYPES.DATE_RANGE}
            dateRangeValue={{
              startDate: draft[`${field.name}From`] ?? "",
              endDate: draft[`${field.name}To`] ?? "",
            }}
            onDateRangeChange={({ startDate, endDate }) => {
              setValue(`${field.name}From`, startDate);
              setValue(`${field.name}To`, endDate);
            }}
          />
        );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end gap-3">
        {basicFields.map((field) => (
          <div key={field.name} className="w-full max-w-xs">
            {field.label && (
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {field.label}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}

        {/* ml-auto on the group (not each button) keeps search/reset/advanced
            together as one cluster pinned to the right edge, instead of
            trailing immediately after the last field. Assumes this bar owns
            its whole row — pages needing a separate "add" button put it on
            its own row instead of sharing this one (see e.g.
            products-manager.tsx), so it never has to compete for space
            here. */}
        <div className="flex gap-3 ml-auto">
          <Button
            size="sm"
            onClick={handleSearch}
            className="bg-gradient-to-r from-primary to-primary-light text-white hover:opacity-90"
          >
            <Search className="mr-2 h-4 w-4" />
            {searchLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {resetLabel}
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {advancedFields.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdvancedOpen((open) => !open)}
              className="text-gray-500 dark:text-gray-400"
            >
              {advancedLabel}
              <ChevronDown
                className={cn(
                  "ml-1 h-4 w-4 transition-transform",
                  advancedOpen && "rotate-180",
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {advancedFields.length > 0 && advancedOpen && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {advancedFields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              {field.label && (
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {field.label}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The "search text + active/inactive select" filter pair every master-data
 * list manager (products, categories, units, ...) repeats identically. */
export function getSearchAndActiveFilterFields(
  t: (key: string) => string,
  tCommon: (key: string) => string,
): FilterFieldConfig[] {
  return [
    { name: "search", type: "text", placeholder: t("searchPlaceholder") },
    {
      name: "isActive",
      type: "select",
      placeholder: tCommon("allStatus"),
      options: [
        { value: "true", label: t("active") },
        { value: "false", label: t("inactive") },
      ],
    },
  ];
}
