"use client";

import type { ReactNode } from "react";
import {
  Control,
  UseFormHandleSubmit,
  FieldErrors,
  FieldValues,
  UseFormSetValue,
} from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/dynamic-form/dynamic-form-fields";
import type { FieldConfig } from "@/components/dynamic-form/types";

interface EntityDialogProps<T extends FieldValues> {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  title: string;
  fields: FieldConfig<T>[];
  control: Control<T>;
  handleSubmit: UseFormHandleSubmit<T>;
  onSubmit: (data: T) => Promise<void>;
  errors: FieldErrors<T>;
  loading: boolean;
  error: string | null;
  cancelText: string;
  saveText: string;
  savingText: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Threaded down to fields' `onValueChange` (e.g. a pasted map link filling sibling lat/long fields). Omit if no field needs it. */
  setValue?: UseFormSetValue<T>;
  /** Extra content rendered after the generated fields (e.g. a live map preview watching the form's own values) — not part of the `FieldConfig` system since it isn't itself a form field. */
  children?: ReactNode;
  /** Render `content` between two specific fields instead of after all of them — e.g. a map preview positioned right below the "paste a link" field it reacts to, rather than at the very bottom. */
  fieldSlot?: { after: string; content: ReactNode };
}

export function EntityDialog<T extends FieldValues>({
  open,
  onClose,
  title,
  fields,
  control,
  handleSubmit,
  onSubmit,
  errors,
  loading,
  error,
  cancelText,
  saveText,
  savingText,
  maxWidth = "2xl",
  setValue,
  children,
  fieldSlot,
}: EntityDialogProps<T>) {
  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
  }[maxWidth];

  const slotIndex = fieldSlot
    ? fields.findIndex((f) => f.name === fieldSlot.after)
    : -1;
  const fieldsBeforeSlot = slotIndex >= 0 ? fields.slice(0, slotIndex + 1) : fields;
  const fieldsAfterSlot = slotIndex >= 0 ? fields.slice(slotIndex + 1) : [];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      {/* Overrides dialog.tsx's own max-h-[90vh]/overflow-y-auto/padding (via
          Tailwind `!` postfix — plain conflicting classes don't reliably win,
          see [[tailwind-important-override]]): only the fields area scrolls,
          header and footer stay fixed in place. */}
      <DialogContent className={`${maxWidthClass} max-h-[90vh]! overflow-hidden! p-0! flex! flex-col!`}>
        <DialogHeader className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-primary text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            <DynamicFormFields
              fields={fieldsBeforeSlot}
              control={control}
              errors={errors}
              isLoading={loading}
              setValue={setValue}
            />
            {slotIndex >= 0 && fieldSlot?.content}
            {fieldsAfterSlot.length > 0 && (
              <DynamicFormFields
                fields={fieldsAfterSlot}
                control={control}
                errors={errors}
                isLoading={loading}
                setValue={setValue}
              />
            )}

            {children}

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
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
          </div>

          <DialogFooter className="shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary-light text-white"
            >
              {loading ? savingText : saveText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
