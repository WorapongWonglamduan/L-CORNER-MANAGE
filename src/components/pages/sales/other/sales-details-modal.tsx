"use client";

import { Fragment, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "@/lib/toast";

interface RefundItem {
  sale_item_id: string;
  quantity: string;
}

interface Refund {
  id: string;
  refund_number: string;
  total_amount: string;
  reason: string | null;
  created_at: string;
  items: RefundItem[];
}

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
  refund_items?: RefundItem[];
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
  refunds?: Refund[];
}

interface SalesDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  locale: string;
  /** Called after a refund succeeds, so the underlying sales list/table
   * reflects the new stock/refund state without waiting for the modal to
   * close and reopen. */
  onRefunded?: () => void | Promise<void>;
}

function refundedQty(item: SaleItem): number {
  return (item.refund_items ?? []).reduce((sum, r) => sum + Number(r.quantity), 0);
}

export function SalesDetailsModal({
  isOpen,
  onClose,
  sale,
  locale,
  onRefunded,
}: SalesDetailsModalProps) {
  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const canRefund = usePermission("sales.refund");

  const [currentSale, setCurrentSale] = useState(sale);
  const [refundingItemId, setRefundingItemId] = useState<string | null>(null);
  const [refundQuantity, setRefundQuantity] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The parent passes down whatever row it had at click time — if it's
  // reopened for a different sale (or the same one after a refresh), pick
  // that up instead of showing stale data from a previous open.
  if (sale.id !== currentSale.id) {
    setCurrentSale(sale);
  }

  if (!isOpen || !currentSale) return null;

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "-";
    return t(method.toLowerCase());
  };

  const startRefund = (item: SaleItem) => {
    setRefundingItemId(item.id);
    setRefundQuantity(String(Number(item.quantity) - refundedQty(item)));
    setRefundReason("");
  };

  const cancelRefund = () => {
    setRefundingItemId(null);
    setRefundQuantity("");
    setRefundReason("");
  };

  const submitRefund = async (item: SaleItem) => {
    const quantity = Number(refundQuantity);
    const remaining = Number(item.quantity) - refundedQty(item);
    if (!(quantity > 0) || quantity > remaining) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${currentSale.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ sale_item_id: item.id, quantity }],
          reason: refundReason || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to refund");
      }

      const refreshed = await fetch(`/api/sales/${currentSale.id}`).then((r) => r.json());
      setCurrentSale(refreshed);
      cancelRefund();
      toast.success(t("refundSuccess"));
      await onRefunded?.();
    } catch (error) {
      console.error("Error creating refund:", error);
      toast.error(error instanceof Error ? error.message : t("refundError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("orderDetails")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {t("orderNumber")}: {currentSale.sale_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("date")}</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {format(new Date(currentSale.sale_date), "dd/MM/yyyy HH:mm")}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("customer")}</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {t("walkIn")}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("warehouse")}</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {currentSale.warehouse?.name_i18n?.[locale] || "-"}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("paymentMethod")}</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {getPaymentMethodLabel(currentSale.payment_method)}
              </div>
            </div>

            {currentSale.created_by_user && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("createdBy")}</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {currentSale.created_by_user.full_name}
                </div>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("status")}</div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  currentSale.payment_status === "paid"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                }`}>
                  {t(currentSale.payment_status)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  currentSale.status === "completed"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                }`}>
                  {t(currentSale.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t("items")} ({currentSale.items?.length || 0})
            </h3>
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-x-auto">
              <table className="w-full min-w-125">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      {t("product")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      {t("quantity")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      {t("unitPrice")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      {t("amount")}
                    </th>
                    {canRefund && currentSale.status === "completed" && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t("refundItem")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentSale.items?.map((item) => {
                    const refunded = refundedQty(item);
                    const remaining = Number(item.quantity) - refunded;
                    const isRefunding = refundingItemId === item.id;

                    return (
                      <Fragment key={item.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.product?.name_i18n?.[locale] || "-"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.product?.code}
                            </div>
                            {refunded > 0 && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                {t("refundedOf", { refunded, total: Number(item.quantity) })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {Number(item.quantity).toLocaleString()}
                              {item.product?.base_unit?.abbreviation_i18n?.[locale] && (
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  {item.product.base_unit.abbreviation_i18n[locale]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-gray-900 dark:text-white">
                              ฿{Number(item.unit_price).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              ฿{Number(item.total_amount).toLocaleString()}
                            </div>
                          </td>
                          {canRefund && currentSale.status === "completed" && (
                            <td className="px-4 py-3 text-right">
                              {remaining <= 0 ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {t("fullyRefunded")}
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startRefund(item)}
                                  disabled={isRefunding}
                                >
                                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                  {t("refundItem")}
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                        {isRefunding && (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 bg-amber-50 dark:bg-amber-950/30">
                              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <div className="w-full sm:w-32">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    {t("refundQuantity")} ({t("remainingRefundable", { remaining })})
                                  </label>
                                  <Input
                                    inputType={INPUT_TYPES.NUMBER}
                                    value={refundQuantity}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setRefundQuantity(e.target.value)
                                    }
                                    min={1}
                                    max={remaining}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    {t("refundReason")}
                                  </label>
                                  <Input
                                    inputType={INPUT_TYPES.TEXT}
                                    value={refundReason}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setRefundReason(e.target.value)
                                    }
                                    placeholder={t("refundReasonPlaceholder")}
                                  />
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    onClick={() => submitRefund(item)}
                                    disabled={
                                      submitting ||
                                      !(Number(refundQuantity) > 0) ||
                                      Number(refundQuantity) > remaining
                                    }
                                    className="bg-gradient-to-r from-primary to-primary-light text-white"
                                  >
                                    {t("refundConfirm")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelRefund}
                                    disabled={submitting}
                                  >
                                    {tCommon("cancel")}
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refund History */}
          {(currentSale.refunds?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {t("refundHistory")}
              </h3>
              <div className="space-y-2">
                {currentSale.refunds!.map((refund) => (
                  <div
                    key={refund.id}
                    className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {refund.refund_number}
                      </span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        -฿{Number(refund.total_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(new Date(refund.created_at), "dd/MM/yyyy HH:mm")}
                    </div>
                    {refund.reason && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {refund.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>{t("subtotal")}</span>
                <span className="font-semibold">
                  ฿{Number(currentSale.subtotal).toLocaleString()}
                </span>
              </div>

              {Number(currentSale.discount_amount) > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{t("discount")}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -฿{Number(currentSale.discount_amount).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between text-xl font-bold text-primary">
                <span>{t("grandTotal")}</span>
                <span>฿{Number(currentSale.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          {currentSale.note && (
            <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                {t("note")}
              </div>
              <div className="text-sm text-yellow-700">{currentSale.note}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 p-6 rounded-b-2xl">
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
