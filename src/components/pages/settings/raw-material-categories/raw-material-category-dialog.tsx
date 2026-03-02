"use client";

import { useTranslations } from "next-intl";
import {
  Control,
  UseFormHandleSubmit,
  FieldErrors,
} from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormFields } from "@/components/ui/FormFields";
import { getRawMaterialCategoryFormConfig } from "./config";
import { RawMaterialCategoryFormData } from "./helper";

interface RawMaterialCategoryDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  category: { id: string } | null;
  onSubmit: (data: RawMaterialCategoryFormData) => Promise<void>;
  control: Control<RawMaterialCategoryFormData>;
  handleSubmit: UseFormHandleSubmit<RawMaterialCategoryFormData>;
  errors: FieldErrors<RawMaterialCategoryFormData>;
  loading: boolean;
  error: string | null;
}

export default function RawMaterialCategoryDialog({
  open,
  onClose,
  category,
  onSubmit,
  control,
  handleSubmit,
  errors,
  loading,
  error,
}: RawMaterialCategoryDialogProps) {
  const t = useTranslations("settings.rawMaterialCategories");

  const formConfig = getRawMaterialCategoryFormConfig(t);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {category ? t("editCategory") : t("addCategory")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <FormFields
              fields={formConfig}
              control={control}
              errors={errors}
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
