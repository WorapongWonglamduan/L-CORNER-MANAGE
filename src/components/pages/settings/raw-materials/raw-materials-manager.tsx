"use client";

import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useRawMaterialsManager } from "./helper";
import { getRawMaterialFormConfig } from "./config";

export default function RawMaterialsManager() {
  const {
    t,
    rawMaterials,
    units,
    unitsLoading,
    categories,
    categoriesLoading,
    loading,
    searchQuery,
    setSearchQuery,
    dialogOpen,
    editingRawMaterial,
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
  } = useRawMaterialsManager();

  const getCategoryLabel = (category: { id: string; name_i18n: { th: string; en: string } } | null | undefined) => {
    if (!category) return "-";
    return category.name_i18n.th;
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
          {t("addRawMaterial")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : rawMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rawMaterials.map((rawMaterial) => (
              <div
                key={rawMaterial.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-[#213559] group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#213559]/10 p-3 rounded-xl group-hover:bg-[#213559]/20 transition-colors">
                      <Package className="h-6 w-6 text-[#213559]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {rawMaterial.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {rawMaterial.code}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(rawMaterial)}
                    onDelete={() => handleDelete(rawMaterial.id)}
                    editTitle={t("edit") || "แก้ไข"}
                    deleteTitle={t("delete") || "ลบ"}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">
                      {t("category")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {getCategoryLabel(rawMaterial.category)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">{t("unit")}:</span>
                    <span className="font-semibold text-gray-900">
                      {rawMaterial.unit?.abbreviation_i18n.th || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("costPrice")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {rawMaterial.cost_price
                        ? `฿${Number(rawMaterial.cost_price).toLocaleString()}`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("currentStock")}:
                    </span>
                    <span
                      className={`font-semibold ${
                        Number(rawMaterial.current_stock) <=
                        Number(rawMaterial.min_stock)
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      {Number(rawMaterial.current_stock).toLocaleString()}{" "}
                      {rawMaterial.unit?.abbreviation_i18n.th}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("minStock")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {Number(rawMaterial.min_stock).toLocaleString()}{" "}
                      {rawMaterial.unit?.abbreviation_i18n.th}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rawMaterial.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {rawMaterial.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rawMaterials.length > 0 && (
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
        title={editingRawMaterial ? t("editRawMaterial") : t("addRawMaterial")}
        fields={getRawMaterialFormConfig(t, units, categories)}
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
