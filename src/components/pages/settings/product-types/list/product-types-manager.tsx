"use client";

import { Plus, FolderTree } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useProductTypesManager } from "./helper";
import { getProductTypeFormConfig } from "../form/config";

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

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

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
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addType")}
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

      {loading && types.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : types.length === 0 ? (
        <EmptyState icon={FolderTree} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {types.map((productType) => (
              <EntityCard key={productType.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
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
                  <DetailRow label={t("code")} value={productType.code} bordered={false} />
                  <DetailRow
                    label={t("type")}
                    value={
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(productType.id)}`}
                      >
                        {productType.name_i18n[locale]}
                      </span>
                    }
                  />
                  <DetailRow label={t("sortOrder")} value={productType.sort_order} />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={productType.is_active}
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
