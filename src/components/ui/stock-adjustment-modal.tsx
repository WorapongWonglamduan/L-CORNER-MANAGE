"use client";

import { useState, useCallback } from "react";
import { X, Plus, Minus, RotateCcw, Package } from "lucide-react";
import { Input, INPUT_TYPES } from "./Input";
import { Button } from "./button";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    code: string;
    current_stock: number;
    unit: string;
    product_type: string;
  };
  onSuccess?: () => void;
}

type AdjustmentType = "in" | "out" | "adjustment";

export function StockAdjustmentModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  console.log("product ->", product);

  const t = useTranslations("inventory.adjustment");

  const getNewStock = useCallback(() => {
    const qty = parseFloat(quantity) || 0;
    if (adjustmentType === "in") {
      return product.current_stock + qty;
    } else if (adjustmentType === "out") {
      return product.current_stock - qty;
    } else {
      return qty;
    }
  }, [quantity, adjustmentType, product.current_stock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }

    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }

    const newStock = getNewStock();
    if (newStock < 0) {
      toast.error("สต็อกไม่สามารถติดลบได้");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          adjustment_type: adjustmentType,
          quantity: parseFloat(quantity),
          reason,
          note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to adjust stock");
      }

      toast.success("ปรับสต็อกสำเร็จ");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("เกิดข้อผิดพลาดในการปรับสต็อก");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const newStock = getNewStock();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t("title")}</h2>
              <p className="text-sm text-blue-100/80">
                {product.code} - {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Stock Display */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("currentStock")}</p>
                <p className="text-3xl font-bold text-gray-900">
                  {product.current_stock.toLocaleString()}
                  <span className="text-lg text-gray-500 ml-2">
                    {product.unit}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t("newStock")}</p>
                <p
                  className={`text-3xl font-bold ${
                    newStock < 0
                      ? "text-red-600"
                      : newStock > product.current_stock
                        ? "text-green-600"
                        : newStock < product.current_stock
                          ? "text-orange-600"
                          : "text-gray-900"
                  }`}
                >
                  {newStock.toLocaleString()}
                  <span className="text-lg ml-2">{product.unit}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t("adjustmentType")} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType("in")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  adjustmentType === "in"
                    ? "border-green-500 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                }`}
              >
                <Plus
                  className={`w-6 h-6 mx-auto mb-2 ${
                    adjustmentType === "in" ? "text-green-600" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    adjustmentType === "in" ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  {t("increase")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType("out")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  adjustmentType === "out"
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                <Minus
                  className={`w-6 h-6 mx-auto mb-2 ${
                    adjustmentType === "out"
                      ? "text-orange-600"
                      : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    adjustmentType === "out"
                      ? "text-orange-700"
                      : "text-gray-600"
                  }`}
                >
                  {t("decrease")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType("adjustment")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  adjustmentType === "adjustment"
                    ? "border-[#213559] bg-[#213559]/10 shadow-md"
                    : "border-gray-200 hover:border-[#213559]/30 hover:bg-[#213559]/5"
                }`}
              >
                <RotateCcw
                  className={`w-6 h-6 mx-auto mb-2 ${
                    adjustmentType === "adjustment"
                      ? "text-[#213559]"
                      : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    adjustmentType === "adjustment"
                      ? "text-[#213559]"
                      : "text-gray-600"
                  }`}
                >
                  {t("adjust")}
                </p>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <Input
            label={
              adjustmentType === "adjustment"
                ? t("newStockAmount")
                : adjustmentType === "in"
                  ? t("quantityIncrease")
                  : t("quantityDecrease")
            }
            inputType={INPUT_TYPES.NUMBER}
            value={quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuantity(e.target.value)
            }
            placeholder="0"
            required
            min="0"
            step="0.01"
          />

          {/* Reason */}
          <Input
            label={t("reason")}
            inputType={INPUT_TYPES.SELECT}
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setReason(e.target.value)
            }
            required
            options={[
              { value: t("reasons.receive"), label: t("reasons.receive") },
              { value: t("reasons.withdraw"), label: t("reasons.withdraw") },
              { value: t("reasons.damage"), label: t("reasons.damage") },
              { value: t("reasons.expired"), label: t("reasons.expired") },
              { value: t("reasons.recount"), label: t("reasons.recount") },
              { value: t("reasons.update"), label: t("reasons.update") },
              { value: t("reasons.other"), label: t("reasons.other") },
            ]}
          />

          {/* Note */}
          <Input
            label={t("noteOptional")}
            inputType={INPUT_TYPES.TEXTAREA}
            value={note}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNote(e.target.value)
            }
            placeholder={t("notePlaceholder")}
          />

          {/* Warning */}
          {newStock < 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">{t("errorTitle")}</p>
                <p className="text-sm text-red-600 mt-1">
                  {t("errorNegative")}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              className="flex-1 bg-gradient-to-r from-[#213559] to-[#2c4a7a] hover:from-[#1a2a47] hover:to-[#213559] text-white"
              disabled={loading || newStock < 0}
            >
              {loading ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
