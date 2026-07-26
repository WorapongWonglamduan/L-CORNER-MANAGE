"use client";

import Image from "next/image";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Tag,
  Layers,
  DollarSign,
  ChefHat,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { useProductDetail } from "./helper";

export default function ProductDetailContent() {
  const { t, product, loading, actions, modal } = useProductDetail();
  const { handleBack, handleEdit, handleDelete } = actions;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center py-20">
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      </div>
    );
  }

  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0];
  const profit =
    product.selling_price && product.cost_price
      ? Number(product.selling_price) - Number(product.cost_price)
      : null;
  const profitMargin =
    profit !== null && product.selling_price
      ? ((profit / Number(product.selling_price)) * 100).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="self-start">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("detail.backToList")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              {t("edit")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("delete")}
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative bg-gradient-to-r from-primary to-primary-light p-6">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-xl bg-white/10 backdrop-blur-sm overflow-hidden shrink-0">
                {primaryImage ? (
                  <Image
                    src={primaryImage.url}
                    alt={product.name_i18n.th}
                    fill
                    className="object-contain p-1"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-white/70" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white truncate">
                  {product.name_i18n.th}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/90 font-mono bg-white/15 px-2 py-0.5 rounded">
                    {product.code}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active
                        ? "bg-green-400/90 text-green-900"
                        : "bg-gray-300 text-gray-700"
                    }`}
                  >
                    {product.is_active ? t("active") : t("inactive")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="text-xs">{t("productType")}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {product.product_type.name_i18n.th}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-xs">{t("category")}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {product.category?.name_i18n.th ?? "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-xs">{t("baseUnit")}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {product.base_unit.name_i18n.th} (
                  {product.base_unit.abbreviation_i18n.th})
                </span>
              </div>
            </div>

            {(product.description_i18n?.th || product.description_i18n?.en) && (
              <p className="text-sm text-gray-600 border-t border-gray-100 pt-4">
                {product.description_i18n?.th || product.description_i18n?.en}
              </p>
            )}

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary p-1 rounded">
                    <DollarSign className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {t("sellingPrice")}
                  </span>
                </div>
                <span className="text-xl font-bold text-primary">
                  {product.selling_price
                    ? `฿${Number(product.selling_price).toLocaleString()}`
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  {t("costPrice")}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {product.cost_price
                    ? `฿${Number(product.cost_price).toLocaleString()}`
                    : "-"}
                </span>
              </div>
              {profit !== null && profitMargin !== null && (
                <div className="flex items-center justify-between sm:col-span-2 pt-3 border-t border-primary/10">
                  <span className="text-xs font-medium text-gray-600">
                    {t("detail.profit")}
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    ฿{profit.toLocaleString()} ({profitMargin}%)
                  </span>
                </div>
              )}
            </div>

            {product.track_stock && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">
                    {t("currentStock")}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Number(product.current_stock).toLocaleString()}{" "}
                    {product.base_unit.abbreviation_i18n.th}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">
                    {t("minStockLevel")}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Number(product.min_stock_level).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">
                    {t("lowStockThreshold")}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Number(product.low_stock_threshold).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {product.images.length > 1 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-2">{t("images")}</p>
                <div className="flex gap-2 flex-wrap">
                  {product.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                    >
                      <Image
                        src={img.url}
                        alt={product.code}
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.recipes && product.recipes.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ChefHat className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-gray-900">
                    {t("recipeTitle")}
                  </p>
                </div>
                <div className="space-y-2">
                  {product.recipes[0].ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">
                        {ing.ingredient.name_i18n.th}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {Number(ing.quantity).toLocaleString()}{" "}
                        {ing.unit.abbreviation_i18n.th}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <modal.ConfirmDialog />
    </div>
  );
}
