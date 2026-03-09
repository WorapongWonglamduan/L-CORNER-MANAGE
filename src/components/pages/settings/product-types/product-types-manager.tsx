"use client";

import { Plus, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useProductTypesManager } from "./helper";
import { getProductTypeFormConfig } from "./config";

export default function ProductTypesManager() {
  const {
    t,
    types,
    loading,
    searchQuery,
    setSearchQuery,
    dialogOpen,
    editingType,
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
    locale,
  } = useProductTypesManager();

  const getTypeBadgeColor = (id: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-yellow-100 text-yellow-800",
      "bg-purple-100 text-purple-800",
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
          {t("addType")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FolderTree className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((productType) => (
              <div
                key={productType.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-[#213559] group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* <div className="bg-[#213559]/10 p-3 rounded-xl group-hover:bg-[#213559]/20 transition-colors text-2xl">
                      {productType.icon || <FolderTree className="h-6 w-6 text-[#213559]" />}
                    </div> */}
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {productType.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {productType.name_i18n.en}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(productType)}
                    onDelete={() => handleDelete(productType.id)}
                    editTitle={t("edit") || "แก้ไข"}
                    deleteTitle={t("delete") || "ลบ"}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">{t("code")}:</span>
                    <span className="font-semibold text-gray-900">
                      {productType.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">{t("type")}:</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(productType.id)}`}
                    >
                      {productType.name_i18n[locale]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("sortOrder")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {productType.sort_order}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        productType.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {productType.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={filterOptions.page}
            totalPages={totalPages}
            itemsPerPage={filterOptions.pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handlePageSizeChange}
          />
        </>
      )}

      <EntityDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingType ? t("editType") : t("addType")}
        fields={getProductTypeFormConfig(t)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading}
        error={formError}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
      />

      <ConfirmDialog />
    </div>
  );
}
