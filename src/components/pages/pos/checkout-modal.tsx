"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS, PaymentMethod } from "@/constants/payment";
import { useTranslations } from "next-intl";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  cartItemCount: number;
  onConfirm: (paymentMethod: string) => Promise<void>;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cartTotal,
  cartItemCount,
  onConfirm,
}: CheckoutModalProps) {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS.CASH);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const change = Number(amountPaid) - cartTotal;

  // Auto-fill amount when modal opens or payment method changes to cash
  useEffect(() => {
    if (isOpen && paymentMethod === PAYMENT_METHODS.CASH) {
      setAmountPaid(cartTotal.toFixed(2));
    }
  }, [isOpen, paymentMethod, cartTotal]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (paymentMethod === PAYMENT_METHODS.CASH && Number(amountPaid) < cartTotal) {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(paymentMethod);
      onClose();
      setAmountPaid("");
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAmounts = [
    { label: "Exact", value: Number(cartTotal.toFixed(2)) },
    { label: "฿100", value: 100 },
    { label: "฿200", value: 200 },
    { label: "฿500", value: 500 },
    { label: "฿1000", value: 1000 },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">{t("checkoutTitle")}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{t("itemCount")}</span>
              <span className="font-semibold">{cartItemCount} {t("items")}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between text-xl font-bold text-[#213559]">
              <span>{t("total")}</span>
              <span>฿{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t("paymentMethod")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod(PAYMENT_METHODS.CASH)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PAYMENT_METHODS.CASH
                    ? "border-[#213559] bg-[#213559]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Banknote
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.CASH ? "text-[#213559]" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.CASH ? "text-[#213559]" : "text-gray-600"
                  }`}
                >
                  {t("cash")}
                </span>
              </button>

              <button
                onClick={() => setPaymentMethod(PAYMENT_METHODS.CARD)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PAYMENT_METHODS.CARD
                    ? "border-[#213559] bg-[#213559]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CreditCard
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.CARD ? "text-[#213559]" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.CARD ? "text-[#213559]" : "text-gray-600"
                  }`}
                >
                  {t("card")}
                </span>
              </button>
            </div>
          </div>

          {/* Amount Paid (Cash only) */}
          {paymentMethod === PAYMENT_METHODS.CASH && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t("amountReceived")}
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
              />

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-5 gap-2 mt-3">
                {quickAmounts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setAmountPaid(item.value.toString())}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      index === 0
                        ? "bg-[#213559] text-white hover:bg-[#2c4a7a]"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Change */}
              {amountPaid && Number(amountPaid) >= cartTotal && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-semibold">
                      {t("change")}
                    </span>
                    <span className="text-2xl font-bold text-green-700">
                      ฿{change.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Insufficient Amount Warning */}
              {amountPaid &&
                Number(amountPaid) > 0 &&
                Number(amountPaid) < cartTotal && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl">
                    <span className="text-red-700 font-semibold text-sm">
                      {t("insufficientAmount")}
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-6 text-lg font-semibold"
              disabled={isProcessing}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                isProcessing ||
                (paymentMethod === "cash" &&
                  (!amountPaid || Number(amountPaid) < cartTotal))
              }
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-lg font-bold shadow-lg"
            >
              {isProcessing ? t("processing") : t("confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
