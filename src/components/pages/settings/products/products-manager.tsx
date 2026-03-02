"use client";

import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useProductsManager } from "./helper";
import { getProductFormConfig } from "./config";

export default function ProductsManager() {
  const {
    t,
    products,
    units,
    unitsLoading,
    categories,
    categoriesLoading,
    loading,
    searchQuery,
    setSearchQuery,
    dialogOpen,
    editingProduct,
    filterOptions,
    totalItems,
    totalPages,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
    handlePageChange,
    handlePageSizeChange,
    formControl,
    formHandleSubmit,
    formErrors,
    formLoading,
    formError,
    ConfirmDialog,
  } = useProductsManager();

  const getCategoryLabel = (category: { id: string; name_i18n: { th: string; en: string } } | null | undefined) => {
    if (!category) return "-";
    return category.name_i18n.th;
  };

  const getProductTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      finished_good: "สินค้าสำเร็จรูป",
      raw_material: "วัตถุดิบ",
      semi_finished: "สินค้ากึ่งสำเร็จรูป",
      service: "บริการ",
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("searchPlaceholder")}
        />
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white shadow-lg shadow-[#213559]/30 hover:shadow-xl hover:shadow-[#213559]/40"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addProduct")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-[#213559] group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#213559]/10 p-3 rounded-xl group-hover:bg-[#213559]/20 transition-colors">
                      <Package className="h-6 w-6 text-[#213559]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {product.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.code}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(product)}
                    onDelete={() => handleDelete(product.id)}
                    editTitle={t("edit") || "แก้ไข"}
                    deleteTitle={t("delete") || "ลบ"}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">
                      {t("productType")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {getProductTypeLabel(product.product_type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("category")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {getCategoryLabel(product.category)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">{t("baseUnit")}:</span>
                    <span className="font-semibold text-gray-900">
                      {product.base_unit?.abbreviation_i18n.th || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("minStockLevel")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {Number(product.min_stock_level).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {product.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={filterOptions.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={filterOptions.pageSize}
                totalItems={totalItems}
                onItemsPerPageChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      )}

      <EntityDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingProduct ? t("editProduct") : t("addProduct")}
        fields={getProductFormConfig(t, units, categories)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading || unitsLoading || categoriesLoading}
        error={formError}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="3xl"
      />
      
      <ConfirmDialog />
    </div>
  );
}
