"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Package, AlertTriangle, TrendingDown, History } from "lucide-react";
import { useInventoryManager } from "./helper";
import { Button } from "@/components/ui/button";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { StockAdjustmentModal } from "./stock-adjustment-modal";
import { StockHistoryModal } from "./stock-history-modal";
import { Pagination } from "@/components/ui/pagination";
import { useTranslations } from "next-intl";

export default function InventoryContent() {
  const {
    products,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    refetch,
    getStockStatus,
    locale,
  } = useInventoryManager();

  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const handleAdjustStock = useCallback((product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name_i18n[locale],
      code: product.code,
      current_stock: Number(product.current_stock),
      unit: product.base_unit.abbreviation_i18n[locale],
      product_type: product.product_type.type,
    });
    setIsStockModalOpen(true);
  }, [locale]);

  const handleViewHistory = useCallback((product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name_i18n[locale],
      code: product.code,
      current_stock: Number(product.current_stock),
      unit: product.base_unit.abbreviation_i18n[locale],
      product_type: product.product_type.type,
    });
    setIsHistoryModalOpen(true);
  }, [locale]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <Sidebar />

      <div className="flex-1 px-4 py-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("title")}
          </h1>
          <p className="text-gray-600">{tCommon("manageYourData")}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <Input
              inputType={INPUT_TYPES.TEXT}
              placeholder={tCommon("search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Type Filter */}
            <Input
              inputType={INPUT_TYPES.SELECT}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "ingredient", label: t("rawMaterial") },
                { value: "finished_good", label: t("finishedGood") },
                { value: "semi_finished", label: t("semiFinished") },
              ]}
            />

            {/* Status Filter */}
            <Input
              inputType={INPUT_TYPES.SELECT}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "low", label: t("lowStock") },
                { value: "out", label: t("outOfStock") },
                { value: "normal", label: t("normal") },
              ]}
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
                <p className="text-gray-600">{tCommon("loading")}</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">{tCommon("noData")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("code")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("name")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("currentStock")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("minStock")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("status")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => {
                      const status = getStockStatus(product);
                      const isLowStock = status.label !== "normal";
                      const percentage =
                        (Number(product.current_stock) /
                          Number(product.low_stock_threshold)) *
                        100;

                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isLowStock
                              ? `${status.bgColor} border-l-4 ${status.borderColor}`
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {product.code}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name_i18n[locale as "th" | "en"]}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {
                                    product.product_type.name_i18n[
                                      locale as "th" | "en"
                                    ]
                                  }
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-gray-900">
                                {Number(product.current_stock).toLocaleString()}{" "}
                                {
                                  product.base_unit.abbreviation_i18n[
                                    locale as "th" | "en"
                                  ]
                                }
                              </div>
                              {isLowStock && (
                                <TrendingDown
                                  className={`w-4 h-4 ${status.textColor}`}
                                />
                              )}
                            </div>
                            {isLowStock && (
                              <div className="mt-1 bg-gray-200 rounded-full h-1.5 overflow-hidden w-24">
                                <div
                                  className={`h-full ${
                                    status.color === "red"
                                      ? "bg-red-500"
                                      : "bg-orange-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {Number(product.min_stock_level).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isLowStock && (
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.textColor}`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {t(status.label)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleAdjustStock(product)}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                {t("adjustStock")}
                              </Button>
                              <Button
                                onClick={() => handleViewHistory(product)}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                itemsPerPage={pageSize}
                totalItems={totalItems}
                onItemsPerPageChange={setPageSize}
              />
            </>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <>
          <StockAdjustmentModal
            isOpen={isStockModalOpen}
            onClose={() => setIsStockModalOpen(false)}
            product={selectedProduct}
            onSuccess={() => {
              refetch();
              setIsStockModalOpen(false);
            }}
          />
          <StockHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            product={selectedProduct}
          />
        </>
      )}
    </div>
  );
}
