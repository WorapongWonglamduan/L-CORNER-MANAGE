"use client";

import { Plus, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCardGrid, EntityCard } from "@/components/ui/entity-card-grid";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { useShopsManager } from "./helper";
import { getShopFormConfig } from "../form/config";

export default function ShopsManager() {
  const {
    t,
    table: { shops, loading, totalItems, totalPages },
    filters,
    pagination: { handlePageChange, handlePageSizeChange },
    actions: { handleCreate, handleEdit, handleDelete },
    form: {
      dialogOpen,
      editingShop,
      control: formControl,
      handleSubmit: formHandleSubmit,
      errors: formErrors,
      loading: formLoading,
      error: formError,
      handleDialogClose,
      handleFormSubmit,
    },
    modal: { ConfirmDialog },
  } = useShopsManager();
  const tCommon = useTranslations("common");
  const { filterOptions } = filters;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addShop")}
        </Button>
      </div>

      <DynamicFilterBar
        fields={[{ name: "search", type: "text", label: tCommon("search"), placeholder: t("searchPlaceholder") }]}
        values={{ search: filters.search }}
        onApply={filters.applyFilters}
        onReset={filters.resetFilters}
        searchLabel={tCommon("search")}
        resetLabel={tCommon("reset")}
      />

      {loading && shops.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : shops.length === 0 ? (
        <EmptyState icon={Building2} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {shops.map((shop) => (
              <EntityCard key={shop.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {shop.logo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={shop.logo_path}
                        alt={shop.name_i18n.th}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-light flex items-center justify-center shrink-0 text-white font-bold">
                        {shop.name_i18n.th.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {shop.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {shop.name_i18n.en}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(shop)}
                    onDelete={() => handleDelete(shop.id)}
                    editTitle={t("edit")}
                    deleteTitle={t("delete")}
                  />
                </div>

                <div className="space-y-2">
                  <DetailRow label={t("branches")} value={shop._count?.warehouses ?? 0} bordered={false} />
                  <DetailRow label={t("users")} value={shop._count?.users ?? 0} />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={shop.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

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
        title={editingShop ? t("editShop") : t("addShop")}
        fields={getShopFormConfig(t, editingShop ? "edit" : "create", editingShop?.id)}
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
