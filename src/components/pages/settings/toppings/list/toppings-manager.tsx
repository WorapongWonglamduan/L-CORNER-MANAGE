"use client";

import { Plus, IceCreamCone, Layers } from "lucide-react";
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
import { RelationPickerDialog } from "@/components/ui/relation-picker-dialog";
import { useRelationPicker } from "@/hooks/useRelationPicker";
import { useToppingsManager, Topping } from "./helper";
import { getToppingFormConfig } from "../form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";

export default function ToppingsManager() {
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const {
    t,
    table: { items: toppings, loading },
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
      editingItem: editingTopping,
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
      ingredients,
    },
    availableProducts,
    refetch,
  } = useToppingsManager();

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

  const availabilityPicker = useRelationPicker<Topping>({
    buildEndpoint: (topping) => `/api/toppings/${topping.id}`,
    bodyKey: "product_ids",
    getInitialIds: (topping) => topping.available_on.map((a) => a.product_id),
    onSaved: refetch,
    savedMessage: t("save"),
    errorFallback: t("saving"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addTopping")}
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

      {loading && toppings.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : toppings.length === 0 ? (
        <EmptyState icon={IceCreamCone} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {toppings.map((topping) => (
              <EntityCard key={topping.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0 flex items-center justify-center">
                      <IceCreamCone className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {topping.name_i18n[locale]}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ฿{Number(topping.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => availabilityPicker.open(topping)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title={t("availableProducts")}
                    >
                      <Layers className="h-4 w-4 text-primary" />
                    </button>
                    <ActionButtons
                      onEdit={() => handleEdit(topping)}
                      onDelete={() => handleDelete(topping.id)}
                      editTitle={t("edit")}
                      deleteTitle={t("delete")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <DetailRow
                    label={t("ingredient")}
                    value={topping.ingredient?.name_i18n[locale] || "-"}
                    bordered={false}
                  />
                  <DetailRow
                    label={t("quantityPerServing")}
                    value={Number(topping.quantity_per_serving).toLocaleString()}
                  />
                  <DetailRow label={t("availableProducts")} value={topping.available_on.length} />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={topping.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

          {toppings.length > 0 && (
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
        title={editingTopping ? t("editTopping") : t("addTopping")}
        fields={getToppingFormConfig(t, ingredients, locale)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading || dataLoading}
        error={formError}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
      />

      <RelationPickerDialog
        isOpen={availabilityPicker.isOpen}
        title={t("availableProducts")}
        items={availableProducts.map((product) => ({
          id: product.id,
          label: product.name_i18n[locale],
          sublabel: product.code,
        }))}
        selectedIds={availabilityPicker.selectedIds}
        onToggle={availabilityPicker.toggle}
        onClose={availabilityPicker.close}
        onSave={availabilityPicker.save}
        saving={availabilityPicker.saving}
        emptyLabel={t("noData")}
        cancelLabel={t("cancel")}
        saveLabel={t("save")}
        savingLabel={t("saving")}
      />

      <ConfirmDialog />
    </div>
  );
}
