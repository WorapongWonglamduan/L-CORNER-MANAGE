"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { CreditCard, Banknote, Tag, QrCode } from "lucide-react";
import generatePayload from "promptpay-qr";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PAYMENT_METHODS, PaymentMethod } from "@/constants/payment";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import type { DisplayPaymentState } from "./helper";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  cartItemCount: number;
  promptpayId?: string | null;
  onDisplayStateChange?: (state: DisplayPaymentState) => void;
  onConfirm: (paymentMethod: string, promotionCode?: string) => Promise<void>;
}

interface PromoValidation {
  code: string;
  discount_amount: number;
}

interface CheckoutFormValues {
  paymentMethod: PaymentMethod;
  amountPaid: string;
  promoCodeInput: string;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cartTotal,
  cartItemCount,
  promptpayId,
  onDisplayStateChange,
  onConfirm,
}: CheckoutModalProps) {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const { control, watch, setValue } = useForm<CheckoutFormValues>({
    defaultValues: { paymentMethod: PAYMENT_METHODS.CASH, amountPaid: "", promoCodeInput: "" },
  });
  const paymentMethod = watch("paymentMethod");
  const amountPaid = watch("amountPaid");
  const promoCodeInput = watch("promoCodeInput");

  const discountedTotal = cartTotal - (promoValidation?.discount_amount || 0);
  const change = Number(amountPaid) - discountedTotal;

  const qrPayload = useMemo(() => {
    if (paymentMethod !== PAYMENT_METHODS.QR || !promptpayId) return null;
    return generatePayload(promptpayId, { amount: discountedTotal });
  }, [paymentMethod, promptpayId, discountedTotal]);

  // Mirrors the QR (or lack thereof) onto the customer-facing display while
  // this modal is open. Guarded by `isProcessing`: once confirm is clicked,
  // `onConfirm` clears the cart on success, which zeroes the `cartTotal`
  // prop this effect depends on (via qrPayload/discountedTotal) *before*
  // the modal has actually closed — without the guard that re-fires this
  // effect mid-confirm with a bogus "awaiting ฿0" push, stomping on the
  // "payment succeeded" state the parent sets moments earlier. Deliberately
  // does NOT reset to null on close either — the same success screen must
  // survive the close. Cancelling instead resets explicitly, see
  // handleClose below.
  useEffect(() => {
    if (!onDisplayStateChange || !isOpen || isProcessing) return;
    if (paymentMethod === PAYMENT_METHODS.QR && qrPayload) {
      onDisplayStateChange({
        status: "awaiting_qr",
        qrPayload,
        amount: discountedTotal,
      });
    } else {
      onDisplayStateChange(null);
    }
  }, [
    isOpen,
    isProcessing,
    paymentMethod,
    qrPayload,
    discountedTotal,
    onDisplayStateChange,
  ]);

  // Radix's onOpenChange fires again once `isOpen` flips false after a
  // successful confirm (not just for user-driven dismissal), so a plain
  // "reset to null on close" here would race the success screen the parent
  // just set. This ref, set synchronously right before the success path's
  // onClose(), lets handleClose tell the two apart.
  const justSucceededRef = useRef(false);

  // User-initiated dismissal (Cancel / backdrop / Esc) — as opposed to
  // onClose() called after a successful confirm, which must leave the
  // display's success screen alone.
  const handleClose = () => {
    if (justSucceededRef.current) {
      justSucceededRef.current = false;
      onClose();
      return;
    }
    onDisplayStateChange?.(null);
    onClose();
  };

  // Auto-fill amount when modal opens, payment method changes to cash, or the
  // applied discount changes the amount due.
  useEffect(() => {
    if (isOpen && paymentMethod === PAYMENT_METHODS.CASH) {
      setValue("amountPaid", discountedTotal.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentMethod, discountedTotal]);

  // Reset promo state whenever the modal is closed.
  useEffect(() => {
    if (!isOpen) {
      setValue("promoCodeInput", "");
      setPromoValidation(null);
      setPromoError("");
    }
  }, [isOpen, setValue]);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCodeInput.trim(), subtotal: cartTotal }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPromoError(data.error || t("cannotSave"));
        setPromoValidation(null);
        return;
      }
      setPromoValidation({ code: data.code, discount_amount: data.discount_amount });
    } catch (error) {
      console.error("Promo validation error:", error);
      setPromoError(t("cannotSave"));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoValidation(null);
    setValue("promoCodeInput", "");
    setPromoError("");
  };

  const handleConfirm = async () => {
    if (paymentMethod === PAYMENT_METHODS.CASH && Number(amountPaid) < discountedTotal) {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(paymentMethod, promoValidation?.code);
      justSucceededRef.current = true;
      onClose();
      setValue("amountPaid", "");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(
        t("paymentError", {
          message: error instanceof Error ? error.message : t("cannotSave"),
        }),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAmounts = [
    { label: "Exact", value: Number(discountedTotal.toFixed(2)) },
    { label: "฿100", value: 100 },
    { label: "฿200", value: 200 },
    { label: "฿500", value: 500 },
    { label: "฿1000", value: 1000 },
  ];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Blocks accidental close (outside click / Escape) while a payment
        // is actually being submitted — everything else behaves like every
        // other dialog in the app.
        if (!open && !isProcessing) handleClose();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh]! overflow-hidden! p-0! flex! flex-col! gap-0! rounded-2xl!">
        <DialogHeader className="shrink-0 border-b border-gray-200 p-6">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {t("checkoutTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{t("itemCount")}</span>
              <span className="font-semibold">{cartItemCount} {t("items")}</span>
            </div>
            {promoValidation && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>{t("subtotalBeforeDiscount")}</span>
                  <span>฿{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>
                    {t("promoDiscount")} ({promoValidation.code})
                  </span>
                  <span>-฿{promoValidation.discount_amount.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="border-t border-gray-300 pt-2 flex justify-between text-xl font-bold text-primary">
              <span>{t("total")}</span>
              <span>฿{discountedTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Promo Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t("promoCode")}
            </label>
            {promoValidation ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border-2 border-green-200">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <Tag className="w-4 h-4" />
                  {t("promoApplied", { code: promoValidation.code })}
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t("removePromo")}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Controller
                  name="promoCodeInput"
                  control={control}
                  render={({ field }) => (
                    <Input
                      inputType={INPUT_TYPES.TEXT}
                      containerClassName="flex-1"
                      value={field.value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                      placeholder={t("promoCodePlaceholder")}
                    />
                  )}
                />
                <Button
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCodeInput.trim()}
                  variant="outline"
                  className="shrink-0"
                >
                  {promoLoading ? t("promoApplying") : t("applyPromo")}
                </Button>
              </div>
            )}
            {promoError && (
              <p className="mt-2 text-sm text-red-600">{promoError}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t("paymentMethod")}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setValue("paymentMethod", PAYMENT_METHODS.CASH)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PAYMENT_METHODS.CASH
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Banknote
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.CASH ? "text-primary" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.CASH ? "text-primary" : "text-gray-600"
                  }`}
                >
                  {t("cash")}
                </span>
              </button>

              <button
                onClick={() => setValue("paymentMethod", PAYMENT_METHODS.CARD)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PAYMENT_METHODS.CARD
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CreditCard
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.CARD ? "text-primary" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.CARD ? "text-primary" : "text-gray-600"
                  }`}
                >
                  {t("card")}
                </span>
              </button>

              <button
                onClick={() => setValue("paymentMethod", PAYMENT_METHODS.QR)}
                disabled={!promptpayId}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PAYMENT_METHODS.QR
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                } ${!promptpayId ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <QrCode
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.QR ? "text-primary" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.QR ? "text-primary" : "text-gray-600"
                  }`}
                >
                  {t("qr")}
                </span>
              </button>
            </div>
            {paymentMethod === PAYMENT_METHODS.QR && !promptpayId && (
              <p className="mt-2 text-sm text-red-600">{t("qrNotConfigured")}</p>
            )}
          </div>

          {/* QR PromptPay */}
          {paymentMethod === PAYMENT_METHODS.QR && qrPayload && (
            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="bg-white p-4 rounded-xl">
                <QRCode value={qrPayload} size={200} />
              </div>
              <p className="text-sm text-gray-600">{t("qrScanInstruction")}</p>
              <p className="text-2xl font-bold text-primary">
                ฿{discountedTotal.toLocaleString()}
              </p>
            </div>
          )}

          {/* Amount Paid (Cash only) */}
          {paymentMethod === PAYMENT_METHODS.CASH && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t("amountReceived")}
              </label>
              <Controller
                name="amountPaid"
                control={control}
                render={({ field }) => (
                  <Input
                    inputType={INPUT_TYPES.NUMBER}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0.00"
                    className="text-lg"
                  />
                )}
              />

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-5 gap-2 mt-3">
                {quickAmounts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setValue("amountPaid", item.value.toString())}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      index === 0
                        ? "bg-primary text-white hover:bg-primary-light"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Change */}
              {amountPaid && Number(amountPaid) >= discountedTotal && (
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
                Number(amountPaid) < discountedTotal && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl">
                    <span className="text-red-700 font-semibold text-sm">
                      {t("insufficientAmount")}
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-gray-200 p-6 sm:justify-stretch">
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => handleClose()}
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
                  (!amountPaid || Number(amountPaid) < discountedTotal))
              }
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-lg font-bold"
            >
              {isProcessing ? t("processing") : t("confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
