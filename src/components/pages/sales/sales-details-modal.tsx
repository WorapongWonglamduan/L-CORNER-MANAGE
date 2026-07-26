"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

interface SaleItem {
  id: string;
  quantity: string;
  unit_price: string;
  total_amount: string;
  product?: {
    name_i18n?: Record<string, string>;
    code?: string;
    base_unit?: {
      abbreviation_i18n?: Record<string, string>;
    };
  };
}

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  subtotal: string;
  discount_amount: string;
  tax_rate: string;
  tax_amount: string;
  total_amount: string;
  payment_method: string | null;
  payment_status: string;
  status: string;
  note: string | null;
  warehouse?: {
    name_i18n?: Record<string, string>;
  };
  created_by_user?: {
    full_name: string;
  } | null;
  items?: SaleItem[];
}

interface SalesDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  locale: string;
}

export function SalesDetailsModal({
  isOpen,
  onClose,
  sale,
  locale,
}: SalesDetailsModalProps) {
  const t = useTranslations("sales");

  if (!isOpen || !sale) return null;

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "-";
    return t(method.toLowerCase());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("orderDetails")}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t("orderNumber")}: {sale.sale_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t("date")}</div>
              <div className="font-semibold text-gray-900">
                {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t("customer")}</div>
              <div className="font-semibold text-gray-900">
                {t("walkIn")}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t("warehouse")}</div>
              <div className="font-semibold text-gray-900">
                {sale.warehouse?.name_i18n?.[locale] || "-"}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t("paymentMethod")}</div>
              <div className="font-semibold text-gray-900">
                {getPaymentMethodLabel(sale.payment_method)}
              </div>
            </div>

            {sale.created_by_user && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t("createdBy")}</div>
                <div className="font-semibold text-gray-900">
                  {sale.created_by_user.full_name}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t("status")}</div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  sale.payment_status === "paid" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {t(sale.payment_status)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  sale.status === "completed" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {t(sale.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("items")} ({sale.items?.length || 0})
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full min-w-125">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      {t("product")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      {t("quantity")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      {t("unitPrice")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      {t("amount")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {item.product?.name_i18n?.[locale] || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.product?.code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-gray-900">
                          {Number(item.quantity).toLocaleString()}
                          {item.product?.base_unit?.abbreviation_i18n?.[locale] && (
                            <span className="text-gray-500 ml-1">
                              {item.product.base_unit.abbreviation_i18n[locale]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-gray-900">
                          ฿{Number(item.unit_price).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ฿{Number(item.total_amount).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>{t("subtotal")}</span>
                <span className="font-semibold">
                  ฿{Number(sale.subtotal).toLocaleString()}
                </span>
              </div>
              
              {Number(sale.discount_amount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{t("discount")}</span>
                  <span className="font-semibold text-red-600">
                    -฿{Number(sale.discount_amount).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-300 pt-3 flex justify-between text-xl font-bold text-primary">
                <span>{t("grandTotal")}</span>
                <span>฿{Number(sale.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          {sale.note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-yellow-800 mb-1">
                {t("note")}
              </div>
              <div className="text-sm text-yellow-700">{sale.note}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
          <Button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-light text-white py-3 text-lg font-semibold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
