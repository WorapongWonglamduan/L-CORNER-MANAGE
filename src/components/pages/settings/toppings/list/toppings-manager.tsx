"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToppingsManager, Topping } from "./helper";
import { getToppingFormConfig } from "../form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";
import { toast } from "@/lib/toast";

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

  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilityTopping, setAvailabilityTopping] =
    useState<Topping | null>(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const { watch, setValue, reset } = useForm<{ selectedProductIds: string[] }>({
    defaultValues: { selectedProductIds: [] },
  });
  const selectedProductIds = watch("selectedProductIds");

  const handleOpenAvailability = (topping: Topping) => {
    setAvailabilityTopping(topping);
    reset({ selectedProductIds: topping.available_on.map((a) => a.product_id) });
    setAvailabilityDialogOpen(true);
  };

  const handleCloseAvailability = () => {
    setAvailabilityDialogOpen(false);
    setAvailabilityTopping(null);
    reset({ selectedProductIds: [] });
  };

  const toggleProductId = (id: string) => {
    setValue(
      "selectedProductIds",
      selectedProductIds.includes(id)
        ? selectedProductIds.filter((p) => p !== id)
        : [...selectedProductIds, id],
    );
  };

  const handleSaveAvailability = async () => {
    if (!availabilityTopping) return;
    try {
      setSavingAvailability(true);
      const response = await fetch(`/api/toppings/${availabilityTopping.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedProductIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("saving"));
      }

      toast.success(t("save"));
      handleCloseAvailability();
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("saving");
      toast.error(message);
    } finally {
      setSavingAvailability(false);
    }
  };

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
                      onClick={() => handleOpenAvailability(topping)}
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

      <Dialog
        open={availabilityDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseAvailability();
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl font-bold">
              {t("availableProducts")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {availableProducts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                {t("noData")}
              </p>
            ) : (
              availableProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Input
                    inputType={INPUT_TYPES.CHECKBOX}
                    checked={selectedProductIds.includes(product.id)}
                    onCheckedChange={() => toggleProductId(product.id)}
                  />
                  <span
                    className="text-sm text-gray-900 dark:text-white cursor-pointer"
                    onClick={() => toggleProductId(product.id)}
                  >
                    {product.name_i18n[locale]}{" "}
                    <span className="text-gray-500 dark:text-gray-400">({product.code})</span>
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseAvailability}
              disabled={savingAvailability}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="bg-gradient-to-r from-primary to-primary-light text-white"
            >
              {savingAvailability ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
