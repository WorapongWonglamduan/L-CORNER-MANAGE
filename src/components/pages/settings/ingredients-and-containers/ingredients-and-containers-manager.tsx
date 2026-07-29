"use client";

import { Plus, Package } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, type FilterFieldConfig } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useIngredientsAndContainersManager } from "./helper";
import { getIngredientContainerFormConfig } from "./form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";

export default function IngredientsAndContainersManager() {
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const {
    t,
    table: { items: ingredientsAndContainers, loading },
    filters,
    pagination: {
      filterOptions,
      totalItems,
      totalPages,
      handlePageChange,
      handlePageSizeChange,
    },
    actions: { handleCreate, handleEdit, handleDelete },
    dialog: {
      open: dialogOpen,
      editingItem: editingIngredientContainer,
      onClose: handleDialogClose,
      ConfirmDialog,
    },
    form: {
      control: formControl,
      handleSubmit: formHandleSubmit,
      errors: formErrors,
      loading: formLoading,
      error: formError,
      onSubmit: handleFormSubmit,
      dataLoading,
      units,
      productTypes,
    },
  } = useIngredientsAndContainersManager();

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

  const getTypeLabel = (
    type:
      | { id: string; name_i18n: { th: string; en: string } }
      | null
      | undefined,
  ) => {
    if (!type) return "-";
    return type.name_i18n.th;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addIngredientContainer")}
        </Button>
      </div>

      <DynamicFilterBar
        fields={filterFields}
        values={{ search: filters.search, isActive: filters.isActive }}
        onApply={filters.applyFilters}
        onReset={filters.resetFilters}
        searchLabel={tCommon("search")}
        resetLabel={tCommon("reset")}
      />

      {loading && ingredientsAndContainers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t("loading")}</p>
          </div>
        </div>
      ) : ingredientsAndContainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredientsAndContainers.map((ingredientContainer) => (
              <div
                key={ingredientContainer.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                      {ingredientContainer.primary_image_url && ingredientContainer.primary_image_url.startsWith('/') ? (
                        <Image
                          src={ingredientContainer.primary_image_url}
                          alt={ingredientContainer.name_i18n.th}
                          fill
                          className="object-contain p-1"
                          sizes="64px"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {ingredientContainer.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ingredientContainer.code}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(ingredientContainer)}
                    onDelete={() => handleDelete(ingredientContainer.id)}
                    editTitle={t("edit") || "แก้ไข"}
                    deleteTitle={t("delete") || "ลบ"}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t("type")}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {getTypeLabel(ingredientContainer.type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t("unit")}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {ingredientContainer.unit?.abbreviation_i18n.th || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("costPrice")}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {ingredientContainer.cost_price
                        ? `฿${Number(ingredientContainer.cost_price).toLocaleString()}`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("currentStock")}:
                    </span>
                    <span
                      className={`font-semibold ${
                        Number(ingredientContainer.current_stock) <=
                        Number(ingredientContainer.min_stock)
                          ? "text-red-600"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {Number(ingredientContainer.current_stock).toLocaleString()}{" "}
                      {ingredientContainer.unit?.abbreviation_i18n.th}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("minStock")}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {Number(ingredientContainer.min_stock).toLocaleString()}{" "}
                      {ingredientContainer.unit?.abbreviation_i18n.th}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("status")}:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ingredientContainer.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {ingredientContainer.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {ingredientsAndContainers.length > 0 && (
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
        title={editingIngredientContainer ? t("editIngredientContainer") : t("addIngredientContainer")}
        fields={getIngredientContainerFormConfig(t, units, productTypes, locale)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading || dataLoading}
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
