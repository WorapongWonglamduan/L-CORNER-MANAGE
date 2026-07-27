"use client";

import {
  Control,
  UseFormHandleSubmit,
  FieldErrors,
  FieldValues,
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
}: EntityDialogProps<T>) {
  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className={`${maxWidthClass} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-primary text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <DynamicFormFields
              fields={fields}
              control={control}
              errors={errors}
              isLoading={loading}
            />
          </div>

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

          <DialogFooter className="mt-4">
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
