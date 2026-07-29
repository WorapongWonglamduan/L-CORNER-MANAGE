"use client";

import { Plus, FolderTree } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, type FilterFieldConfig } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useProductTypesManager } from "./helper";
import { getProductTypeFormConfig } from "./form/config";

export default function ProductTypesManager() {
  const {
    t,
    locale,
    table: { types, loading, totalItems, totalPages },
    filters,
    pagination: { handlePageChange, handlePageSizeChange },
    actions: { handleCreate, handleEdit, handleDelete },
    form: {
      dialogOpen,
      editingType,
      control: formControl,
      handleSubmit: formHandleSubmit,
      errors: formErrors,
      loading: formLoading,
      error: formError,
      handleDialogClose,
      handleFormSubmit,
    },
    modal: { ConfirmDialog },
  } = useProductTypesManager();
  const tCommon = useTranslations("common");
  const { filterOptions } = filters;

  const filterFields: FilterFieldConfig[] = [
    { name: "search", type: "text", placeholder: t("searchPlaceholder") },
    {
      name: "isActive",
      type: "select",
      placeholder: tCommon("allStatus"),
      options: [
        { value: "true", label: t("active") },
        { value: "false", label: t("inactive") },
      ],
    },
  ];

  const getTypeBadgeColor = (id: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DynamicFilterBar
          fields={filterFields}
          values={{ search: filters.search, isActive: filters.isActive }}
          onApply={filters.applyFilters}
          onReset={filters.resetFilters}
          searchLabel={tCommon("search")}
          resetLabel={tCommon("reset")}
          className="w-full"
        />
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addType")}
        </Button>
      </div>

      {loading && types.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t("loading")}</p>
          </div>
        </div>
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <FolderTree className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((productType) => (
              <div
                key={productType.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors text-2xl">
                      {productType.icon || <FolderTree className="h-6 w-6 text-primary" />}
                    </div> */}
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {productType.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t("code")}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {productType.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t("type")}:</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(productType.id)}`}
                    >
                      {productType.name_i18n[locale]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("sortOrder")}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {productType.sort_order}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("status")}:
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        productType.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
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
