"use client";

import { useState, useEffect, useCallback } from "react";
import { X, TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const tCommon = useTranslations("common");
  const tPagination = useTranslations("pagination");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inventory/movements?product_id=${product.id}&page=${page}&pageSize=10`
      );
      const data = await response.json();
      setMovements(data.items || []);
      setTotalPages(data.totalPages || 1);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t("title")}
              </h2>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#213559] mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {tCommon("loading")}
                </p>
              </div>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">
                {t("noHistory")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Movement Type & Direction */}
                      <div className="flex items-center gap-2 mb-2">
                        {movement.direction === "in" ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {getMovementTypeLabel(movement.movement_type)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            movement.direction === "in"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t(movement.direction === "in" ? "in" : "out")}
                        </span>
                      </div>

                      {/* Reason */}
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">
                          {t("reason")}:
                        </span>{" "}
                        {movement.reason_text}
                      </p>

                      {/* Note */}
                      {movement.note && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">
                            {t("note")}:
                          </span>{" "}
                          {movement.note}
                        </p>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(movement.transaction_date)}
                      </div>
                    </div>

                    {/* Quantity Changes */}
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">
                        {t("before")}
                      </div>
                      <div className="text-lg font-semibold text-gray-700 mb-2">
                        {Number(movement.quantity_before).toLocaleString()}{" "}
                        <span className="text-sm text-gray-500">{product.unit}</span>
                      </div>

                      <div
                        className={`text-sm font-bold mb-2 ${
                          movement.direction === "in" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {movement.direction === "in" ? "+" : "-"}
                        {Number(movement.quantity_change).toLocaleString()}
                      </div>

                      <div className="text-xs text-gray-500 mb-1">
                        {t("after")}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {Number(movement.quantity_after).toLocaleString()}{" "}
                        <span className="text-sm text-gray-500">{product.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {tPagination("previous")}
              </button>
              <span className="text-sm text-gray-600">
                {tCommon("page")} {page} {tPagination("of")} {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {tPagination("next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
