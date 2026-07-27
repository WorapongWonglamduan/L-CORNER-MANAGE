"use client";

import { X, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/dynamic-form/dynamic-form-fields";
import { useStockTransfer } from "./transfer-helper";
import { getTransferFormConfig } from "./transfer-config";
import type { Warehouse } from "./helper";
import type { Locale } from "@/types/i18n";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromWarehouseId: string;
  warehouses: Warehouse[];
  locale: Locale;
  onSuccess?: () => void;
}

export function TransferModal({
  isOpen,
  onClose,
  fromWarehouseId,
  warehouses,
  locale,
  onSuccess,
}: TransferModalProps) {
  const {
    t,
    loading,
    products,
    selectedProduct,
    destinationWarehouses,
    control,
    handleSubmit,
    errors,
    onSubmit,
  } = useStockTransfer({ isOpen, fromWarehouseId, warehouses, onSuccess, onClose });

  if (!isOpen) return null;

  const transferFields = getTransferFormConfig(t, products, destinationWarehouses, locale);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 bg-gradient-to-r from-primary to-primary-light text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">{t("title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Product */}
          <DynamicFormFields
            fields={[transferFields[0]]}
            control={control}
            errors={errors}
          />

          {selectedProduct && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm text-gray-700">
              {t("available")}:{" "}
              <span className="font-semibold">
                {selectedProduct.available_quantity.toLocaleString()}{" "}
                {selectedProduct.base_unit?.abbreviation_i18n[locale]}
              </span>
            </div>
          )}

          {/* Destination Warehouse / Quantity / Note */}
          <DynamicFormFields
            fields={transferFields.slice(1)}
            control={control}
            errors={errors}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-primary-light hover:from-[#1a2a47] hover:to-primary text-white"
              disabled={loading || destinationWarehouses.length === 0}
            >
              {loading ? t("transferring") : t("confirm")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
