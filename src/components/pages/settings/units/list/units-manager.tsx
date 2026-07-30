"use client";

import { Plus, Package } from "lucide-react";
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
import { useUnitsManager } from "./helper";
import { getUnitFormConfig } from "../form/config";

export default function UnitsManager() {
  const { t, table, filters, pagination, actions, dialog, ConfirmDialog } =
    useUnitsManager();
  const tCommon = useTranslations("common");
  const { units, allUnits, loading } = table;
  const { filterOptions, totalItems, totalPages, handlePageChange, handlePageSizeChange } =
    pagination;
  const { handleCreate, handleEdit, handleDelete } = actions;

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addUnit")}
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

      {loading && units.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : units.length === 0 ? (
        <EmptyState icon={Package} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {units.map((unit) => (
              <EntityCard key={unit.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {unit.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {unit.name_i18n.en}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(unit)}
                    onDelete={() => handleDelete(unit.id)}
                    editTitle={t("edit") || "แก้ไข"}
                    deleteTitle={t("delete") || "ลบ"}
                  />
                </div>

                <div className="space-y-2">
                  <DetailRow
                    label={t("abbreviationTh")}
                    value={unit.abbreviation_i18n.th}
                    bordered={false}
                  />
                  <DetailRow label={t("abbreviationEn")} value={unit.abbreviation_i18n.en} />
                  <DetailRow label={t("unitType")} value={unit.unit_type || "-"} />
                  <DetailRow
                    label={t("baseUnit")}
                    value={unit.is_base_unit ? t("yes") : t("no")}
                  />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={unit.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

          {allUnits.length > 0 && (
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
        open={dialog.open}
        onClose={dialog.onClose}
        title={dialog.editingUnit ? t("editUnit") : t("addUnit")}
        fields={getUnitFormConfig(t)}
        control={dialog.control}
        handleSubmit={dialog.handleSubmit}
        onSubmit={dialog.onSubmit}
        errors={dialog.errors}
        loading={dialog.loading}
        error={dialog.error}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
      />
      
      <ConfirmDialog />
    </div>
  );
}
