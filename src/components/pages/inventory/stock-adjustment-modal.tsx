"use client";

import {
  X,
  Plus,
  Minus,
  RotateCcw,
  Package,
  ChefHat,
  AlertCircle,
} from "lucide-react";

import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { ADJUSTMENT_TYPES } from "@/constants/inventory";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { useStockAdjustment } from "./stock-adjustment-helper";
import { getStockAdjustmentFormConfig } from "./stock-adjustment-config";

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

export function StockAdjustmentModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: StockAdjustmentModalProps) {
  // Use custom hook - all logic is in helper
  const {
    adjustmentType,
    loading,
    recipe,
    loadingRecipe,
    quantity,
    reason,
    control,
    handleFormSubmit,
    errors,
    formConfig,
    Controller,
    newStock,
    calculatedIngredients,
    setAdjustmentType,
    handleProduction,
    handleSubmit,
    t,
  } = useStockAdjustment({ isOpen, product, onSuccess, onClose });

  if (!isOpen) return null;

  const qty = parseFloat(quantity) || 0;

  // Production modal for semi_finished products
  if (product.product_type === PRODUCTS_TYPES.SEMI_FINISHED) {

    console.log("Semi-finished modal state:", {
      quantity,
      qty,
      reason,
      loading,
      isDisabled: loading || !quantity || parseFloat(quantity) <= 0 || !reason,
    });

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">ผลิตสินค้า</h2>
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

          {/* Content */}
          <form
            onSubmit={handleFormSubmit(async (data) => {
              await handleProduction();
            })}
            className="p-6 space-y-6"
          >
            {loadingRecipe ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559]"></div>
              </div>
            ) : !recipe ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-800">
                      ไม่พบสูตรการผลิต
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      กรุณาสร้างสูตรการผลิตสำหรับสินค้านี้ก่อน
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Current Stock */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">สต็อกปัจจุบัน</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {product.current_stock.toLocaleString()}{" "}
                    <span className="text-lg text-gray-500">
                      {product.unit}
                    </span>
                  </p>
                </div>

                {/* Adjustment Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {t("adjustmentType")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType(ADJUSTMENT_TYPES.IN)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        adjustmentType === ADJUSTMENT_TYPES.IN
                          ? "border-green-500 bg-green-50 shadow-md"
                          : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                      }`}
                    >
                      <Plus
                        className={`w-6 h-6 mx-auto mb-2 ${
                          adjustmentType === ADJUSTMENT_TYPES.IN
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          adjustmentType === ADJUSTMENT_TYPES.IN
                            ? "text-green-700"
                            : "text-gray-600"
                        }`}
                      >
                        {t("increase")}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustmentType(ADJUSTMENT_TYPES.OUT)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        adjustmentType === ADJUSTMENT_TYPES.OUT
                          ? "border-orange-500 bg-orange-50 shadow-md"
                          : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                      }`}
                    >
                      <Minus
                        className={`w-6 h-6 mx-auto mb-2 ${
                          adjustmentType === ADJUSTMENT_TYPES.OUT
                            ? "text-orange-600"
                            : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          adjustmentType === ADJUSTMENT_TYPES.OUT
                            ? "text-orange-700"
                            : "text-gray-600"
                        }`}
                      >
                        {t("decrease")}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAdjustmentType(ADJUSTMENT_TYPES.ADJUSTMENT)
                      }
                      className={`p-4 rounded-xl border-2 transition-all ${
                        adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                          ? "border-[#213559] bg-[#213559]/10 shadow-md"
                          : "border-gray-200 hover:border-[#213559]/30 hover:bg-[#213559]/5"
                      }`}
                    >
                      <RotateCcw
                        className={`w-6 h-6 mx-auto mb-2 ${
                          adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                            ? "text-[#213559]"
                            : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                            ? "text-[#213559]"
                            : "text-gray-600"
                        }`}
                      >
                        {t("adjust")}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                <Controller
                  name="quantity"
                  control={control}
                  rules={{
                    required: "กรุณาระบุจำนวน",
                    min: { value: 0, message: "จำนวนต้องมากกว่า 0" },
                  }}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <Input
                      ref={ref}
                      label={
                        adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                          ? t("newStockAmount")
                          : adjustmentType === ADJUSTMENT_TYPES.IN
                            ? t("quantityIncrease")
                            : t("quantityDecrease")
                      }
                      inputType={INPUT_TYPES.NUMBER}
                      placeholder="0"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={errors.quantity}
                      min="0"
                      step="1"
                    />
                  )}
                />

                {/* Recipe Ingredients List */}
                {recipe?.ingredients && recipe.ingredients.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      วัตถุดิบที่ใช้ในสูตร
                    </h3>
                    <div className="space-y-2">
                      {recipe.ingredients.map((ing) => (
                        <div
                          key={ing.id}
                          className="bg-white rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {ing.ingredient?.name_i18n?.th ||
                                ing.ingredient?.name_i18n?.en}
                            </p>
                            <p className="text-sm text-gray-600">
                              {ing.ingredient?.code}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">
                                {Number(ing.quantity).toLocaleString()}
                              </span>{" "}
                              <span className="text-xs">
                                {ing.unit?.abbreviation_i18n?.th ||
                                  ing.unit?.abbreviation_i18n?.en}
                              </span>
                              <span className="text-gray-500"> / หน่วย</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              มีอยู่:{" "}
                              {Number(
                                ing.ingredient?.current_stock || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calculated Ingredients (when qty > 0) */}
                {qty > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      วัตถุดิบที่ต้องใช้ทั้งหมด
                    </h3>
                    <div className="space-y-2">
                      {calculatedIngredients.map((ing) => (
                        <div
                          key={ing.id}
                          className="bg-white rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {ing.ingredient?.name_i18n?.th ||
                                ing.ingredient?.name_i18n?.en}
                            </p>
                            <p className="text-sm text-gray-600">
                              {ing.ingredient?.code}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-purple-700">
                              {ing.required.toLocaleString()}{" "}
                              <span className="text-sm">
                                {ing.unit?.abbreviation_i18n?.th ||
                                  ing.unit?.abbreviation_i18n?.en}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">
                              มีอยู่:{" "}
                              {Number(
                                ing.ingredient?.current_stock || 0,
                              ).toLocaleString()}
                              {Number(ing.ingredient?.current_stock || 0) <
                                ing.required && (
                                <span className="text-red-600 font-semibold ml-1">
                                  (ไม่พอ!)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Stock Display */}
                {qty > 0 && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">สต็อกใหม่</p>
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
                )}

                {/* Reason */}
                <Controller
                  name="reason"
                  control={control}
                  rules={formConfig[1].rules}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <Input
                      ref={ref}
                      label={formConfig[1].label}
                      inputType={formConfig[1].type}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={errors.reason}
                      options={[
                        { value: "", label: formConfig[1].placeholder },
                        ...formConfig[1].options,
                      ]}
                    />
                  )}
                />

                {/* Note */}
                <Controller
                  name="note"
                  control={control}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <Input
                      ref={ref}
                      label={formConfig[2].label}
                      inputType={formConfig[2].type}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder={formConfig[2].placeholder}
                      rows={formConfig[2].rows}
                    />
                  )}
                />

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#213559] to-[#2c4a7a] hover:from-[#1a2a47] hover:to-[#213559] text-white"
                    disabled={
                      loading ||
                      !quantity ||
                      parseFloat(quantity) <= 0 ||
                      !reason
                    }
                  >
                    {loading ? t("saving") : t("updateStock")}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    );
  }

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

        <form onSubmit={handleFormSubmit(handleSubmit)} className="p-6 space-y-6">
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
                onClick={() => setAdjustmentType(ADJUSTMENT_TYPES.IN)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  adjustmentType === ADJUSTMENT_TYPES.IN
                    ? "border-green-500 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                }`}
              >
                <Plus
                  className={`w-6 h-6 mx-auto mb-2 ${
                    adjustmentType === ADJUSTMENT_TYPES.IN
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    adjustmentType === ADJUSTMENT_TYPES.IN
                      ? "text-green-700"
                      : "text-gray-600"
                  }`}
                >
                  {t("increase")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType(ADJUSTMENT_TYPES.OUT)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  adjustmentType === ADJUSTMENT_TYPES.OUT
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                <Minus
                  className={`w-6 h-6 mx-auto mb-2 ${
                    adjustmentType === ADJUSTMENT_TYPES.OUT
                      ? "text-orange-600"
                      : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    adjustmentType === ADJUSTMENT_TYPES.OUT
                      ? "text-orange-700"
                      : "text-gray-600"
                  }`}
                >
                  {t("decrease")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType(ADJUSTMENT_TYPES.ADJUSTMENT)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                    ? "border-[#213559] bg-[#213559]/10 shadow-md"
                    : "border-gray-200 hover:border-[#213559]/30 hover:bg-[#213559]/5"
                }`}
              >
                <RotateCcw
                  className={`w-6 h-6 mx-auto mb-2 ${
                    adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                      ? "text-[#213559]"
                      : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    adjustmentType === ADJUSTMENT_TYPES.ADJUSTMENT
                      ? "text-[#213559]"
                      : "text-gray-600"
                  }`}
                >
                  {t("adjust")}
                </p>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          {getStockAdjustmentFormConfig(t, adjustmentType).map((field) => (
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
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors[field.name]}
                />
              )}
            />
          ))}

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
