"use client";

import { Plus, Pencil, Trash2, Search, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useRawMaterialCategoriesManager } from "./helper";
import RawMaterialCategoryDialog from "./raw-material-category-dialog";

export default function RawMaterialCategoriesManager() {
  const {
    t,
    categories,
    loading,
    searchQuery,
    setSearchQuery,
    dialogOpen,
    editingCategory,
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
  } = useRawMaterialCategoriesManager();

  const getTypeLabel = (type: string) => {
    return type === "raw_material" ? t("typeRawMaterial") : t("typeProduct");
  };

  const getTypeBadgeColor = (type: string) => {
    return type === "raw_material" 
      ? "bg-blue-100 text-blue-800" 
      : "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#213559]"
          />
        </div>
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white shadow-lg shadow-[#213559]/30 hover:shadow-xl hover:shadow-[#213559]/40"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addCategory")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FolderTree className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-[#213559] group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#213559]/10 p-3 rounded-xl group-hover:bg-[#213559]/20 transition-colors">
                      <FolderTree className="h-6 w-6 text-[#213559]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {category.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.name_i18n.en}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 hover:bg-[#213559]/10 rounded-lg transition-colors"
                      title={t("edit") || "แก้ไข"}
                    >
                      <Pencil className="h-4 w-4 text-[#213559]" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title={t("delete") || "ลบ"}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">
                      {t("code")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {category.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("type")}:
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(category.type)}`}>
                      {getTypeLabel(category.type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("sortOrder")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {category.sort_order}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        category.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {category.is_active ? t("active") : t("inactive")}
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

      <RawMaterialCategoryDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        category={editingCategory}
        onSubmit={handleFormSubmit}
        control={formControl}
        handleSubmit={formHandleSubmit}
        errors={formErrors}
        loading={formLoading}
        error={formError}
      />
      
      <ConfirmDialog />
    </div>
  );
}
