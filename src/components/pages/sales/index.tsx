"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Search, Eye, X } from "lucide-react";
import { useSalesManager } from "./helper";
import { Button } from "@/components/ui/button";
import { SalesDetailsModal } from "./sales-details-modal";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/pagination";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

export default function SalesContent() {
  const {
    sales,
    loading,
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    locale,
  } = useSalesManager();

  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const [selectedSale, setSelectedSale] = useState<typeof sales[0] | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleViewDetails = (sale: typeof sales[0]) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "-";
    return t(method.toLowerCase());
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      paid: { label: t("paid"), className: "bg-green-100 text-green-800" },
      unpaid: { label: t("unpaid"), className: "bg-red-100 text-red-800" },
    };
    const config = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: { label: t("completed"), className: "bg-blue-100 text-blue-800" },
      cancelled: { label: t("cancelled"), className: "bg-gray-100 text-gray-800" },
    };
    const config = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <Sidebar />

      <div className="flex-1 px-4 py-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
          <p className="text-gray-600">{tCommon("manageYourData")}</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
              />
            </div>

            {/* Date Range Picker */}
            <Input
              inputType={INPUT_TYPES.DATE_RANGE}
              dateRangeValue={{ startDate, endDate }}
              onDateRangeChange={({ startDate: newStart, endDate: newEnd }) => {
                setStartDate(newStart);
                setEndDate(newEnd);
              }}
              startPlaceholder="วันที่เริ่มต้น"
              endPlaceholder="วันที่สิ้นสุด"
            />
          </div>

          {/* Active Filters Display */}
          {(searchQuery || startDate || endDate) && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">กรองโดย:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  ค้นหา: {searchQuery}
                  <button onClick={() => setSearchQuery("")} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  ตั้งแต่: {format(new Date(startDate), "dd/MM/yyyy")}
                  <button onClick={() => setStartDate("")} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  ถึง: {format(new Date(endDate), "dd/MM/yyyy")}
                  <button onClick={() => setEndDate("")} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                ล้างทั้งหมด
              </button>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
                <p className="text-gray-600">{t("loading")}</p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg">{t("noOrders")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("orderNumber")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("date")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("customer")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("total")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("paymentMethod")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("paymentStatus")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("status")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{sale.sale_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {t("walkIn")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            ฿{Number(sale.total_amount).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
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
                          <Button
                            onClick={() => handleViewDetails(sale)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            {t("viewDetails")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemsPerPage={pageSize}
                  totalItems={totalItems}
                  onItemsPerPageChange={setPageSize}
                />
              )}
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
        />
      )}
    </div>
  );
}
