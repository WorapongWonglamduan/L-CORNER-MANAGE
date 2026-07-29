"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Eye, Ban } from "lucide-react";
import { useSalesManager } from "./helper";
import { Button } from "@/components/ui/button";
import { SalesDetailsModal } from "./sales-details-modal";
import { Pagination } from "@/components/ui/pagination";
import {
  DynamicFilterBar,
  type FilterFieldConfig,
} from "@/components/ui/dynamic-filter-bar";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { usePermission } from "@/hooks/usePermission";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

export default function SalesContent() {
  const { table, warehouses, warehousesLoading, filters, pagination, actions, modal } =
    useSalesManager();
  const { sales, loading, locale } = table;
  const {
    searchQuery,
    startDate,
    endDate,
    warehouseId,
    setWarehouseId,
    applyFilters,
    resetFilters,
  } = filters;
  const { page, pageSize, totalPages, totalItems, setPage, setPageSize } =
    pagination;
  const { handleVoid, refetch } = actions;
  const { ConfirmDialog } = modal;
  const canVoid = usePermission("sales.void");

  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const [selectedSale, setSelectedSale] = useState<(typeof sales)[0] | null>(
    null,
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const salesFilterFields: FilterFieldConfig[] = [
    { name: "searchQuery", type: "text", placeholder: t("search") },
    { name: "date", type: "date-range" },
  ];

  const handleViewDetails = (sale: (typeof sales)[0]) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "-";
    return t(method.toLowerCase());
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      paid: { label: t("paid"), className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
      unpaid: { label: t("unpaid"), className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    };
    const config = statusMap[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: {
        label: t("completed"),
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      },
      cancelled: {
        label: t("cancelled"),
        className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      },
    };
    const config = statusMap[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      <Sidebar />

      <div className="flex-1 px-4 pt-20 pb-8 md:py-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{tCommon("manageYourData")}</p>
        </div>

        {/* Warehouse scope — defaults to all branches this user is assigned
            to; pick one to narrow the list down to a single branch. */}
        {!warehousesLoading && warehouses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 max-w-xs">
            <Input
              inputType={INPUT_TYPES.SELECT}
              value={warehouseId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setWarehouseId(e.target.value)
              }
              emptyOptionLabel={t("allBranches")}
              emptyOptionIsValue
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.code} - ${w.name_i18n[locale as "th" | "en"]}`,
              }))}
            />
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <DynamicFilterBar
            fields={salesFilterFields}
            values={{
              searchQuery,
              dateFrom: startDate,
              dateTo: endDate,
            }}
            onApply={applyFilters}
            onReset={resetFilters}
            searchLabel={tCommon("search")}
            resetLabel={tCommon("reset")}
          />
        </div>

        {/* Sales Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {loading && sales.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">{t("loading")}</p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noOrders")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("orderNumber")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("date")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("warehouse")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("customer")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("total")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("paymentMethod")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("paymentStatus")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("status")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {sale.sale_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {format(
                              new Date(sale.sale_date),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {sale.warehouse?.name_i18n?.[locale as "th" | "en"] ?? "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {t("walkIn")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ฿{Number(sale.total_amount).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {getPaymentMethodLabel(sale.payment_method)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(sale.payment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(sale.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleViewDetails(sale)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              {t("viewDetails")}
                            </Button>
                            {canVoid && sale.status !== "cancelled" && sale.refunds.length === 0 && (
                              <Button
                                onClick={() => handleVoid(sale)}
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <Ban className="w-4 h-4" />
                                {t("voidSale")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                itemsPerPage={pageSize}
                totalItems={totalItems}
                onItemsPerPageChange={setPageSize}
              />
            </>
          )}
        </div>
      </div>

      {/* Sales Details Modal */}
      {selectedSale && (
        <SalesDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          sale={selectedSale}
          locale={locale}
          onRefunded={refetch}
        />
      )}

      <ConfirmDialog />
    </div>
  );
}
