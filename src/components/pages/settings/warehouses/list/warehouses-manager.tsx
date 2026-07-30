"use client";

import dynamic from "next/dynamic";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
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
import { useWarehousesManager } from "./helper";
import { getWarehouseFormConfig } from "../form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";

// Leaflet touches `window`/`document` at module scope — must be excluded
// from Next's server-render pass of this client component (same reason as
// the dashboard's branches map).
const LocationPreviewMap = dynamic(
  () => import("./location-preview-map").then((mod) => mod.LocationPreviewMap),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" /> },
);

export default function WarehousesManager() {
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const {
    t,
    table: { items: warehouses, loading },
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
      editingItem: editingWarehouse,
      onClose: handleDialogClose,
      ConfirmDialog,
    },
    form: {
      control: formControl,
      handleSubmit: formHandleSubmit,
      errors: formErrors,
      setValue: formSetValue,
      watch: formWatch,
      loading: formLoading,
      error: formError,
      onSubmit: handleFormSubmit,
    },
  } = useWarehousesManager();

  const watchedLatitude = formWatch("latitude");
  const watchedLongitude = formWatch("longitude");

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addWarehouse")}
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

      {loading && warehouses.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : warehouses.length === 0 ? (
        <EmptyState icon={WarehouseIcon} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {warehouses.map((warehouse) => (
              <EntityCard key={warehouse.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block font-mono font-bold text-sm px-2 py-1 rounded-md bg-primary/10 text-primary tracking-wide">
                        {warehouse.code}
                      </span>
                      {warehouse.is_default && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {t("default")}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mt-2">
                      {warehouse.name_i18n[locale]}
                    </h3>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(warehouse)}
                    onDelete={() => handleDelete(warehouse.id)}
                    editTitle={t("edit")}
                    deleteTitle={t("delete")}
                  />
                </div>

                <div className="space-y-2">
                  {warehouse.address && (
                    <div className="py-2.5">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {warehouse.address}
                      </span>
                    </div>
                  )}
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={warehouse.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

          {warehouses.length > 0 && (
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
        title={editingWarehouse ? t("editWarehouse") : t("addWarehouse")}
        fields={getWarehouseFormConfig(t)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        setValue={formSetValue}
        loading={formLoading}
        error={formError}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
        fieldSlot={{
          after: "mapLink",
          content: (
            <LocationPreviewMap
              latitude={watchedLatitude ? Number(watchedLatitude) : null}
              longitude={watchedLongitude ? Number(watchedLongitude) : null}
              emptyLabel={t("mapPreviewEmpty")}
            />
          ),
        }}
      />

      <ConfirmDialog />
    </div>
  );
}
