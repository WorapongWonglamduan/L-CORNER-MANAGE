"use client";

import { useState } from "react";
import { Plus, IceCreamCone, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToppingsManager, Topping } from "./helper";
import { getToppingFormConfig } from "./form/config";
import { useLocale } from "next-intl";
import type { Locale } from "@/types/i18n";
import { toast } from "@/lib/toast";

export default function ToppingsManager() {
  const locale = useLocale() as Locale;
  const {
    t,
    table: { items: toppings, loading },
    filters: { searchQuery, setSearchQuery },
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

  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilityTopping, setAvailabilityTopping] =
    useState<Topping | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const handleOpenAvailability = (topping: Topping) => {
    setAvailabilityTopping(topping);
    setSelectedProductIds(topping.available_on.map((a) => a.product_id));
    setAvailabilityDialogOpen(true);
  };

  const handleCloseAvailability = () => {
    setAvailabilityDialogOpen(false);
    setAvailabilityTopping(null);
    setSelectedProductIds([]);
  };

  const toggleProductId = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("searchPlaceholder")}
        />
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addTopping")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : toppings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <IceCreamCone className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {toppings.map((topping) => (
              <div
                key={topping.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0 flex items-center justify-center">
                      <IceCreamCone className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {topping.name_i18n[locale]}
                      </h3>
                      <p className="text-sm text-gray-500">
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
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">
                      {t("ingredient")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {topping.ingredient?.name_i18n[locale] || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("quantityPerServing")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {Number(topping.quantity_per_serving).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("availableProducts")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {topping.available_on.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        topping.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {topping.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              <p className="text-sm text-gray-500 py-4 text-center">
                {t("noData")}
              </p>
            ) : (
              availableProducts.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProductId(product.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-900">
                    {product.name_i18n[locale]}{" "}
                    <span className="text-gray-500">({product.code})</span>
                  </span>
                </label>
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
