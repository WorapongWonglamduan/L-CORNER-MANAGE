"use client";

import { useTranslations } from "next-intl";
import {
  Control,
  UseFormHandleSubmit,
  FieldErrors,
  Controller,
} from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { getUnitFormConfig } from "./config";
import { UnitFormData } from "./helper";

interface UnitDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  control: Control<UnitFormData>;
  handleSubmit: UseFormHandleSubmit<UnitFormData>;
  onSubmit: (data: UnitFormData) => Promise<void>;
  errors: FieldErrors<UnitFormData>;
  loading: boolean;
  error: string;
}

export default function UnitDialog({
  open,
  onClose,
  control,
  handleSubmit,
  onSubmit,
  errors,
  loading,
  error,
}: UnitDialogProps) {
  const t = useTranslations("settings.units");

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addUnit")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            {getUnitFormConfig(t).map((field) => (
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
                    error={errors[field.name]}
                    value={
                      field.type === INPUT_TYPES.CHECKBOX
                        ? undefined
                        : (value as string) || ""
                    }
                    checked={
                      field.type === INPUT_TYPES.CHECKBOX
                        ? (value as boolean)
                        : undefined
                    }
                    onCheckedChange={
                      field.type === INPUT_TYPES.CHECKBOX ? onChange : undefined
                    }
                    onChange={
                      field.type !== INPUT_TYPES.CHECKBOX ? onChange : undefined
                    }
                    onBlur={onBlur}
                    disabled={field.disabled || loading}
                    autoComplete={field.autoComplete}
                    options={field.options}
                    rows={field.rows}
                  />
                )}
              />
            ))}

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

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white"
            >
              {loading ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
