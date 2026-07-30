"use client";

import { Plus, Package } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, getSearchAndActiveFilterFields } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCardGrid, EntityCard } from "@/components/ui/entity-card-grid";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIngredientsAndContainersManager } from "./helper";
import { getIngredientContainerFormConfig } from "../form/config";
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

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

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
        <LoadingSpinner label={t("loading")} />
      ) : ingredientsAndContainers.length === 0 ? (
        <EmptyState icon={Package} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {ingredientsAndContainers.map((ingredientContainer) => (
              <EntityCard key={ingredientContainer.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                      {/* No longer requires a leading "/" — that check
                          rejected R2's absolute https:// URLs and silently
                          fell back to the placeholder icon for every image
                          once STORAGE_DRIVER=r2 was turned on. */}
                      {ingredientContainer.primary_image_url ? (
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
                  <DetailRow
                    label={t("type")}
                    value={getTypeLabel(ingredientContainer.type)}
                    bordered={false}
                  />
                  <DetailRow
                    label={t("unit")}
                    value={ingredientContainer.unit?.abbreviation_i18n.th || "-"}
                  />
                  <DetailRow
                    label={t("costPrice")}
                    value={
                      ingredientContainer.cost_price
                        ? `฿${Number(ingredientContainer.cost_price).toLocaleString()}`
                        : "-"
                    }
                  />
                  <DetailRow
                    label={t("currentStock")}
                    value={
                      <span
                        className={
                          Number(ingredientContainer.current_stock) <=
                          Number(ingredientContainer.min_stock)
                            ? "text-red-600"
                            : "text-gray-900 dark:text-white"
                        }
                      >
                        {Number(ingredientContainer.current_stock).toLocaleString()}{" "}
                        {ingredientContainer.unit?.abbreviation_i18n.th}
                      </span>
                    }
                  />
                  <DetailRow
                    label={t("minStock")}
                    value={`${Number(ingredientContainer.min_stock).toLocaleString()} ${ingredientContainer.unit?.abbreviation_i18n.th ?? ""}`}
                  />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={ingredientContainer.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

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
