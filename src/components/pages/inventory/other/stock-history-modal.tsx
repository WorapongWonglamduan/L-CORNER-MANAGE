"use client";

import { useState, useEffect, useCallback } from "react";
import { X, TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/utils/date";
import { Pagination } from "@/components/ui/pagination";

interface WarehouseRef {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
}

interface StockMovement {
  id: string;
  movement_type: string;
  direction: string;
  quantity_before: string;
  quantity_change: string;
  quantity_after: string;
  reason_text: string;
  note: string | null;
  transaction_date: string;
  created_at: string;
  warehouse: WarehouseRef | null;
  // Present only for movement_type === "transfer" — the single warehouse
  // field above only tells you which side of the transfer this particular
  // row is; this carries both ends.
  transfer: { from_warehouse: WarehouseRef; to_warehouse: WarehouseRef } | null;
}

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    code: string;
    unit: string;
  };
}

export function StockHistoryModal({
  isOpen,
  onClose,
  product,
}: StockHistoryModalProps) {
  const t = useTranslations("inventory.history");
  const tTransfer = useTranslations("inventory.transfer");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "th" | "en";
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inventory/movements?product_id=${product.id}&page=${page}&pageSize=10`,
      );
      const data = await response.json();
      setMovements(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  }, [product.id, page]);

  useEffect(() => {
    if (isOpen && product.id) {
      fetchMovements();
    }
  }, [isOpen, product.id, fetchMovements]);

  const getMovementTypeLabel = (type: string) => {
    return t(`movementTypes.${type}`, { defaultValue: type });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-light text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t("title")}</h2>
              <p className="text-sm text-blue-100/80">
                {product.code} - {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">{tCommon("loading")}</p>
              </div>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noHistory")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Movement Type & Direction */}
                      <div className="flex items-center gap-2 mb-2">
                        {movement.direction === "in" ? (
                          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {getMovementTypeLabel(movement.movement_type)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            movement.direction === "in"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {t(movement.direction === "in" ? "in" : "out")}
                        </span>
                      </div>

                      {/* Branch */}
                      {movement.warehouse && (
                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                          <span className="font-medium">{t("branch")}:</span>{" "}
                          {movement.warehouse.code} - {movement.warehouse.name_i18n[locale]}
                        </p>
                      )}

                      {/* Transfer: show both ends, not just the single
                          warehouse field above (which is only this row's
                          own side of the transfer). */}
                      {movement.movement_type === "transfer" && movement.transfer && (
                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                          <span className="font-medium">{tTransfer("fromWarehouse")}:</span>{" "}
                          {movement.transfer.from_warehouse.code} -{" "}
                          {movement.transfer.from_warehouse.name_i18n[locale]}
                          {" → "}
                          <span className="font-medium">{tTransfer("toWarehouse")}:</span>{" "}
                          {movement.transfer.to_warehouse.code} -{" "}
                          {movement.transfer.to_warehouse.name_i18n[locale]}
                        </p>
                      )}

                      {/* Reason */}
                      <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                        <span className="font-medium">{t("reason")}:</span>{" "}
                        {movement.reason_text}
                      </p>

                      {/* Note */}
                      {movement.note && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <span className="font-medium">{t("note")}:</span>{" "}
                          {movement.note}
                        </p>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(movement.transaction_date, locale)}
                      </div>
                    </div>

                    {/* Quantity Changes */}
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {t("before")}
                      </div>
                      <div className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {Number(movement.quantity_before).toLocaleString()}{" "}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {product.unit}
                        </span>
                      </div>

                      <div
                        className={`text-sm font-bold mb-2 ${
                          movement.direction === "in"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {movement.direction === "in" ? "+" : "-"}
                        {Number(movement.quantity_change).toLocaleString()}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {t("after")}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(movement.quantity_after).toLocaleString()}{" "}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {product.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsPerPage={pageSize}
              totalItems={totalItems}
              onItemsPerPageChange={setPageSize}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
