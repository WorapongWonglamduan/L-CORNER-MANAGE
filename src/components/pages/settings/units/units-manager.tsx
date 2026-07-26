"use client";

import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useUnitsManager } from "./helper";
import { getUnitFormConfig } from "./form/config";

export default function UnitsManager() {
  const { t, table, filters, pagination, actions, dialog, ConfirmDialog } =
    useUnitsManager();
  const { units, allUnits, loading } = table;
  const { searchQuery, setSearchQuery } = filters;
  const { filterOptions, totalItems, totalPages, handlePageChange, handlePageSizeChange } =
    pagination;
  const { handleCreate, handleEdit, handleDelete } = actions;

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
          {t("addUnit")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {unit.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500">
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
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">
                      {t("abbreviationTh")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {unit.abbreviation_i18n.th}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("abbreviationEn")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {unit.abbreviation_i18n.en}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("unitType")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {unit.unit_type || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("baseUnit")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {unit.is_base_unit ? t("yes") : t("no")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {unit.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
