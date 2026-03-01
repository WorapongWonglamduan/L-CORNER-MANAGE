"use client";

import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useUnitsManager } from "./helper";
import UnitDialog from "./unit-dialog";

export default function UnitsManager() {
  const {
    t,
    units,
    allUnits,
    loading,
    searchQuery,
    setSearchQuery,
    dialogOpen,
    filterOptions,
    totalItems,
    totalPages,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
    handlePageChange,
    handlePageSizeChange,
    formControl,
    formHandleSubmit,
    formErrors,
    formLoading,
    formError,
  } = useUnitsManager();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#213559]"
          />
        </div>
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white shadow-lg shadow-[#213559]/30 hover:shadow-xl hover:shadow-[#213559]/40"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addUnit")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
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
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-[#213559] group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#213559]/10 p-3 rounded-xl group-hover:bg-[#213559]/20 transition-colors">
                      <Package className="h-6 w-6 text-[#213559]" />
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
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="p-2 hover:bg-[#213559]/10 rounded-lg transition-colors"
                      title={t("edit") || "แก้ไข"}
                    >
                      <Pencil className="h-4 w-4 text-[#213559]" />
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title={t("delete") || "ลบ"}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
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

      <UnitDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading}
        error={formError}
      />
    </div>
  );
}
