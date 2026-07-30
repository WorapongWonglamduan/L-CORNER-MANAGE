"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { CreditCard, Banknote, Tag, QrCode, Wallet, Globe, Loader2 } from "lucide-react";
import generatePayload from "promptpay-qr";
import QRCode from "react-qr-code";
import Image from "next/image";
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

// Distinct selection values from PAYMENT_METHODS.QR — that one stays the
// existing client-generated, unconfirmed PromptPay payload (no gateway,
// works with zero setup). These go through POST /api/payments/intents and
// only become a real Sale once the gateway actually confirms the payment —
// see helper.tsx's startGatewayCheckout/finalizeSuccessfulSale.
const OMISE_PROMPTPAY = "omise_promptpay" as const;
const OMISE_TRUEMONEY_QR = "omise_truemoney_qr" as const;
const PAYPAL_QR = "paypal_qr" as const;
type SelectablePaymentMethod =
  | PaymentMethod
  | typeof OMISE_PROMPTPAY
  | typeof OMISE_TRUEMONEY_QR
  | typeof PAYPAL_QR;

// Maps each selectable gateway-checkout option to the (driver, method) pair
// sent to POST /api/payments/intents. All three currently resolve to a
// pending intent carrying either a gateway-hosted QR image (Omise) or a raw
// payload for a client-rendered QR (PayPal's approval URL) — see
// PaymentIntentView below and the render block further down, which treats
// all of them the same via isGatewayMethod.
const GATEWAY_CHECKOUT_OPTIONS: Record<string, { driver: string; method: string }> = {
  [OMISE_PROMPTPAY]: { driver: "omise", method: "promptpay" },
  [OMISE_TRUEMONEY_QR]: { driver: "omise", method: "truemoney_qr" },
  [PAYPAL_QR]: { driver: "paypal", method: "paypal" },
};
function isGatewayMethod(
  method: SelectablePaymentMethod,
): method is typeof OMISE_PROMPTPAY | typeof OMISE_TRUEMONEY_QR | typeof PAYPAL_QR {
  return method in GATEWAY_CHECKOUT_OPTIONS;
}

interface PaymentIntentView {
  id: string;
  status: "pending" | "succeeded" | "failed" | "expired";
  qr_image_url?: string | null;
  qr_payload?: string | null;
  failure_reason?: string | null;
  sale?: { id: string; sale_number?: string; total_amount?: number } | null;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  cartItemCount: number;
  promptpayId?: string | null;
  onDisplayStateChange?: (state: DisplayPaymentState) => void;
  onConfirm: (paymentMethod: string, promotionCode?: string) => Promise<void>;
  /** Starts a gateway-backed payment (e.g. Omise PromptPay) — returns the
   * created PaymentIntent, resolved or still pending. The button itself is
   * only shown when NEXT_PUBLIC_OMISE_PUBLIC_KEY is configured, regardless
   * of whether this prop is wired up. */
  onStartGatewayCheckout?: (
    driver: string,
    method: string,
    options: { promotionCode?: string },
  ) => Promise<PaymentIntentView>;
  /** Runs the same success side effects (toast/print/cart-clear/refetch) as
   * a direct cash/card/manual-QR checkout, once a gateway payment actually
   * resolves to a real Sale. */
  onGatewaySaleCreated?: (sale: { id: string; sale_number?: string; total_amount?: number }) => Promise<void>;
}

interface PromoValidation {
  code: string;
  discount_amount: number;
}

interface CheckoutFormValues {
  paymentMethod: SelectablePaymentMethod;
  amountPaid: string;
  promoCodeInput: string;
}

const GATEWAY_POLL_INTERVAL_MS = 3000;

export function CheckoutModal({
  isOpen,
  onClose,
  cartTotal,
  cartItemCount,
  promptpayId,
  onDisplayStateChange,
  onConfirm,
  onStartGatewayCheckout,
  onGatewaySaleCreated,
}: CheckoutModalProps) {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // NEXT_PUBLIC_* vars are inlined into the client bundle at build time —
  // reading it here (rather than threading a prop through) is enough to
  // decide whether to even show the button, independent of whether the
  // server-side OMISE_SECRET_KEY is also set (if it isn't, createCharge
  // itself will fail with a clear error once actually attempted).
  const omiseConfigured = !!process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
  // PayPal's Orders API is pure server-to-server (no client-side tokenizing
  // SDK involved in this QR-redirect flow), so there's no public key to read
  // here — this flag exists purely to gate the button's visibility, mirrored
  // by the real PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET check server-side in
  // PayPalDriver's constructor.
  const paypalConfigured = process.env.NEXT_PUBLIC_PAYPAL_ENABLED === "true";

  const [gatewayIntent, setGatewayIntent] = useState<PaymentIntentView | null>(null);
  const gatewayPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopGatewayPolling = () => {
    if (gatewayPollRef.current) {
      clearInterval(gatewayPollRef.current);
      gatewayPollRef.current = null;
    }
  };
  useEffect(() => stopGatewayPolling, []);

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
  // this modal is open — either the manual PromptPay payload (qrPayload) or
  // a real gateway-issued QR image (Omise's gatewayIntent.qr_image_url,
  // while still "pending"). Guarded by `isProcessing`: once confirm is
  // clicked, `onConfirm`/finalizeSuccessfulSale clears the cart on success,
  // which zeroes the `cartTotal` prop this effect depends on (via
  // qrPayload/discountedTotal) *before* the modal has actually closed —
  // without the guard that re-fires this effect mid-confirm with a bogus
  // "awaiting ฿0" push, stomping on the "payment succeeded" state the
  // parent sets moments earlier. This is safe for the Omise flow too: by
  // the time gatewayIntent carries a QR, the initial startGatewayCheckout
  // call has already resolved and isProcessing is back to false. Deliberately
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
    } else if (
      isGatewayMethod(paymentMethod) &&
      gatewayIntent?.status === "pending" &&
      (gatewayIntent.qr_image_url || gatewayIntent.qr_payload)
    ) {
      onDisplayStateChange({
        status: "awaiting_qr",
        qrImageUrl: gatewayIntent.qr_image_url ?? undefined,
        qrPayload: gatewayIntent.qr_payload ?? undefined,
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
    gatewayIntent,
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
    stopGatewayPolling();
    if (justSucceededRef.current) {
      justSucceededRef.current = false;
      onClose();
      return;
    }
    onDisplayStateChange?.(null);
    onClose();
  };

  // Note: closing the modal here only stops CLIENT-SIDE polling — the
  // PaymentIntent record itself, and any Omise charge already created for
  // it, still exist server-side. A customer who scans and pays after this
  // point would still have their money captured, but nothing automatically
  // resumes tracking it (no re-open-and-poll flow in this pass) — a known,
  // accepted gap for v1, matching how abandoning the existing manual-QR
  // flow already relies on the cashier's own judgment.
  const stopGatewayCheckout = () => {
    stopGatewayPolling();
    setGatewayIntent(null);
  };

  // Reset gateway state whenever the modal is closed.
  useEffect(() => {
    if (!isOpen) {
      stopGatewayCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const pollGatewayIntent = (intentId: string) => {
    stopGatewayPolling();
    gatewayPollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/intents/${intentId}`);
        const data: PaymentIntentView & { error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(data.error || t("cannotSave"));
        }
        setGatewayIntent(data);

        if (data.status === "succeeded" && data.sale) {
          stopGatewayPolling();
          await onGatewaySaleCreated?.(data.sale);
          justSucceededRef.current = true;
          onClose();
        } else if (data.status === "failed" || data.status === "expired") {
          stopGatewayPolling();
        }
      } catch (error) {
        stopGatewayPolling();
        toast.error(
          t("paymentError", {
            message: error instanceof Error ? error.message : t("cannotSave"),
          }),
        );
      }
    }, GATEWAY_POLL_INTERVAL_MS);
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

    if (isGatewayMethod(paymentMethod)) {
      if (!onStartGatewayCheckout) return;
      setIsProcessing(true);
      try {
        const { driver, method } = GATEWAY_CHECKOUT_OPTIONS[paymentMethod];
        const intent = await onStartGatewayCheckout(driver, method, {
          promotionCode: promoValidation?.code,
        });
        setGatewayIntent(intent);
        if (intent.status === "succeeded" && intent.sale) {
          await onGatewaySaleCreated?.(intent.sale);
          justSucceededRef.current = true;
          onClose();
        } else if (intent.status === "pending") {
          pollGatewayIntent(intent.id);
        }
      } catch (error) {
        console.error("Gateway payment error:", error);
        toast.error(
          t("paymentError", {
            message: error instanceof Error ? error.message : t("cannotSave"),
          }),
        );
      } finally {
        setIsProcessing(false);
      }
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

  const isGatewayWaiting = gatewayIntent?.status === "pending";

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
        <DialogHeader className="shrink-0 border-b border-gray-200 dark:border-gray-600 p-6">
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("checkoutTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{t("itemCount")}</span>
              <span className="font-semibold">{cartItemCount} {t("items")}</span>
            </div>
            {promoValidation && (
              <>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{t("subtotalBeforeDiscount")}</span>
                  <span>฿{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700 dark:text-green-400">
                  <span>
                    {t("promoDiscount")} ({promoValidation.code})
                  </span>
                  <span>-฿{promoValidation.discount_amount.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between text-xl font-bold text-primary">
              <span>{t("total")}</span>
              <span>฿{discountedTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Promo Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              {t("promoCode")}
            </label>
            {promoValidation ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-950/40 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold">
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              {t("paymentMethod")}
            </label>
            {/* Always 3 columns — with 5 options (Omise configured) this
                simply wraps to a second row instead of squeezing 5 narrow
                buttons into one row, which cramped the icon/label inside
                each and wrapped text awkwardly. */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setValue("paymentMethod", PAYMENT_METHODS.CASH)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PAYMENT_METHODS.CASH
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <Banknote
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.CASH ? "text-primary" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.CASH ? "text-primary" : "text-gray-600 dark:text-gray-300"
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
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <CreditCard
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.CARD ? "text-primary" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.CARD ? "text-primary" : "text-gray-600 dark:text-gray-300"
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
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                } ${!promptpayId ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <QrCode
                  className={`w-8 h-8 ${
                    paymentMethod === PAYMENT_METHODS.QR ? "text-primary" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === PAYMENT_METHODS.QR ? "text-primary" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {t("qr")}
                </span>
              </button>

              {omiseConfigured && (
                <button
                  onClick={() => setValue("paymentMethod", OMISE_PROMPTPAY)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === OMISE_PROMPTPAY
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <QrCode
                    className={`w-8 h-8 ${
                      paymentMethod === OMISE_PROMPTPAY ? "text-primary" : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <span
                    className={`font-semibold text-center text-sm ${
                      paymentMethod === OMISE_PROMPTPAY ? "text-primary" : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t("omisePromptpay")}
                  </span>
                </button>
              )}

              {omiseConfigured && (
                <button
                  onClick={() => setValue("paymentMethod", OMISE_TRUEMONEY_QR)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === OMISE_TRUEMONEY_QR
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <Wallet
                    className={`w-8 h-8 ${
                      paymentMethod === OMISE_TRUEMONEY_QR ? "text-primary" : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <span
                    className={`font-semibold text-center text-sm ${
                      paymentMethod === OMISE_TRUEMONEY_QR ? "text-primary" : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t("omiseTrueMoneyQr")}
                  </span>
                </button>
              )}

              {paypalConfigured && (
                <button
                  onClick={() => setValue("paymentMethod", PAYPAL_QR)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === PAYPAL_QR
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <Globe
                    className={`w-8 h-8 ${
                      paymentMethod === PAYPAL_QR ? "text-primary" : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <span
                    className={`font-semibold text-center text-sm ${
                      paymentMethod === PAYPAL_QR ? "text-primary" : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t("paypal")}
                  </span>
                </button>
              )}
            </div>
            {paymentMethod === PAYMENT_METHODS.QR && !promptpayId && (
              <p className="mt-2 text-sm text-red-600">{t("qrNotConfigured")}</p>
            )}
          </div>

          {/* QR PromptPay (manual, unconfirmed) */}
          {paymentMethod === PAYMENT_METHODS.QR && qrPayload && (
            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="bg-white p-4 rounded-xl">
                <QRCode value={qrPayload} size={200} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("qrScanInstruction")}</p>
              <p className="text-2xl font-bold text-primary">
                ฿{discountedTotal.toLocaleString()}
              </p>
            </div>
          )}

          {/* Omise PromptPay / TrueMoney QR / PayPal — real QR from the
              gateway (an image for Omise, a client-rendered QR of the
              approval URL for PayPal), shown once Confirm has actually
              started the charge; polls until the gateway confirms it (see
              pollGatewayIntent above). */}
          {isGatewayMethod(paymentMethod) && gatewayIntent && (
            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              {gatewayIntent.qr_image_url ? (
                <div className="bg-white p-4 rounded-xl relative w-54 h-54">
                  <Image
                    src={gatewayIntent.qr_image_url}
                    alt={t("qrScanInstruction")}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                gatewayIntent.qr_payload && (
                  <div className="bg-white p-4 rounded-xl">
                    <QRCode value={gatewayIntent.qr_payload} size={200} />
                  </div>
                )
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("qrScanInstruction")}</p>
              <p className="text-2xl font-bold text-primary">
                ฿{discountedTotal.toLocaleString()}
              </p>
              {gatewayIntent.status === "pending" && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("waitingForGatewayPayment")}
                </div>
              )}
              {(gatewayIntent.status === "failed" || gatewayIntent.status === "expired") && (
                <p className="text-sm text-red-600">
                  {gatewayIntent.failure_reason || t("gatewayPaymentFailed")}
                </p>
              )}
            </div>
          )}

          {/* Amount Paid (Cash only) */}
          {paymentMethod === PAYMENT_METHODS.CASH && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
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
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Change */}
              {amountPaid && Number(amountPaid) >= discountedTotal && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/40 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 dark:text-green-300 font-semibold">
                      {t("change")}
                    </span>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                      ฿{change.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Insufficient Amount Warning */}
              {amountPaid &&
                Number(amountPaid) > 0 &&
                Number(amountPaid) < discountedTotal && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/40 rounded-xl">
                    <span className="text-red-700 dark:text-red-300 font-semibold text-sm">
                      {t("insufficientAmount")}
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-gray-200 dark:border-gray-600 p-6 sm:justify-stretch">
          {isGatewayWaiting ? (
            // Confirm already fired the real charge — there's nothing left
            // to "confirm" again while waiting on the gateway. This only
            // stops CLIENT-SIDE polling (see stopGatewayCheckout above).
            <Button
              onClick={stopGatewayCheckout}
              variant="outline"
              className="w-full py-6 text-lg font-semibold"
            >
              {t("backToPaymentMethods")}
            </Button>
          ) : (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
