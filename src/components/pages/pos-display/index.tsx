"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingBag, Check } from "lucide-react";
import QRCode from "react-qr-code";
import Image from "next/image";
import type { Locale } from "@/types/i18n";
import type { DisplayPaymentState } from "@/components/pages/pos/helper";

interface DisplayTopping {
  id: string;
  name: string;
  price: number;
}

interface DisplayCartItem {
  lineId: string;
  name: string;
  price: number;
  quantity: number;
  toppings: DisplayTopping[];
}

interface DisplaySnapshot {
  items: DisplayCartItem[];
  total: number;
  itemCount: number;
  payment?: DisplayPaymentState;
}

interface DisplayWarehouse {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
}

function lineTotal(item: DisplayCartItem) {
  const toppingsPricePerUnit = item.toppings.reduce(
    (sum, topping) => sum + topping.price,
    0,
  );
  return (item.price + toppingsPricePerUnit) * item.quantity;
}

export default function POSDisplayContent() {
  const t = useTranslations("posDisplay");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const warehouseId = searchParams.get("warehouseId");
  const [warehouses, setWarehouses] = useState<DisplayWarehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);

  // No branch chosen yet — load the branches this user can pick from.
  useEffect(() => {
    if (warehouseId) return;
    const assignedWarehouseIds = session?.user?.warehouse_ids ?? [];
    if (assignedWarehouseIds.length === 0) return;

    const fetchWarehouses = async () => {
      try {
        setLoadingWarehouses(true);
        const res = await fetch("/api/warehouses?pageSize=100&isActive=true");
        const data = await res.json();
        const items: DisplayWarehouse[] = data.items || [];
        setWarehouses(items.filter((w) => assignedWarehouseIds.includes(w.id)));
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, [warehouseId, session?.user?.warehouse_ids]);

  // Branch chosen — subscribe to its live cart snapshots. The server always
  // sends the branch's latest snapshot (or null) as the first SSE message on
  // connect, so a stale snapshot from a previously selected branch is
  // replaced within one round trip without needing to clear it here first.
  useEffect(() => {
    if (!warehouseId) return;

    const eventSource = new EventSource(
      `/api/pos/display?warehouseId=${warehouseId}`,
    );
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setSnapshot(data);
    };

    return () => eventSource.close();
  }, [warehouseId]);

  if (!warehouseId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary-dark text-white p-4 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">
          {t("selectBranch")}
        </h1>
        {loadingWarehouses ? (
          <p className="text-gray-400">{t("loading")}</p>
        ) : warehouses.length === 0 ? (
          <p className="text-gray-400">{t("noWarehouseAssigned")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
            {warehouses.map((w) => (
              <button
                key={w.id}
                onClick={() =>
                  router.push(`${pathname}?warehouseId=${w.id}`)
                }
                className="p-6 rounded-2xl bg-black/20 hover:bg-black/10 transition-colors text-left"
              >
                <p className="text-sm text-gray-400">{w.code}</p>
                <p className="text-xl font-bold">{w.name_i18n[locale]}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const payment = snapshot?.payment;

  if (payment?.status === "awaiting_qr") {
    return (
      <div className="min-h-screen flex flex-col bg-primary-dark text-white p-4 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-base sm:text-lg text-gray-400">{t("paying")}</p>
          <p className="text-base sm:text-lg text-gray-400">
            {snapshot?.itemCount} {t("items")}
          </p>
        </div>
        {/* Stacked on narrow screens (portrait tablet / small window),
            side-by-side once there's enough width for both the QR and the
            amount to read comfortably at once. */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 py-6">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl shrink-0">
            {payment.qrImageUrl ? (
              // Sized larger than the checkout modal's own QR (240px) on
              // wide screens — this display is meant to be read from
              // normal standing distance across a counter, not held in the
              // hand — but scales down on a narrow window/tablet instead
              // of overflowing it.
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96">
                <Image
                  src={payment.qrImageUrl}
                  alt={t("scanInstruction")}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              // Same responsive wrapper as the image branch above —
              // react-qr-code's own `size` prop only sets the SVG's
              // intrinsic pixel dimensions, but `style` makes it fill
              // whatever container it's in instead (the SVG's viewBox
              // keeps the code scannable at any rendered size).
              <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96">
                <QRCode
                  value={payment.qrPayload ?? ""}
                  size={384}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            )}
          </div>
          <div className="text-center md:text-left max-w-xs">
            <p className="text-lg sm:text-xl text-gray-400 mb-2">{t("amountDue")}</p>
            <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-light mb-4 md:mb-6">
              ฿{payment.amount.toLocaleString()}
            </p>
            <p className="text-base sm:text-lg text-gray-300 mb-4 md:mb-6">
              {t("scanInstruction")}
            </p>
            {/* qrPayload is a real URL for link-based gateways (PayPal's
                approval page) but a raw EMV payload string for the manual
                PromptPay flow — only the former is worth showing as a
                clickable link, e.g. for testing on the same machine
                without a second device to scan with. */}
            {payment.qrPayload?.startsWith("http") && (
              <a
                href={payment.qrPayload}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary-light underline break-all mb-4 md:mb-6"
              >
                {payment.qrPayload}
              </a>
            )}
            <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary-light motion-safe:animate-pulse" />
              <span className="text-sm text-gray-400">{t("waitingConfirm")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (payment?.status === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary-dark text-white gap-3 p-4 text-center">
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-2">
          <Check className="w-7 h-7 sm:w-10 sm:h-10 text-gray-900" strokeWidth={3} />
        </div>
        <p className="text-2xl sm:text-4xl font-bold">{t("successTitle")}</p>
        <p className="text-base sm:text-xl text-gray-400">{t("successSubtitle")}</p>
        <p className="text-base sm:text-lg text-primary-light font-semibold mt-2">
          ฿{payment.amount.toLocaleString()}
          {payment.saleNumber ? ` · ${payment.saleNumber}` : ""}
        </p>
      </div>
    );
  }

  const items = snapshot?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary-dark text-white p-4 text-center">
        <ShoppingBag className="w-16 h-16 sm:w-24 sm:h-24 text-gray-600 mb-6" />
        <p className="text-2xl sm:text-4xl font-bold text-gray-300">{t("idleTitle")}</p>
        <p className="text-base sm:text-xl text-gray-500 mt-2">{t("idleSubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-primary-dark text-white p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{t("currentOrder")}</h1>

      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4">
        {items.map((item) => (
          <div
            key={item.lineId}
            className="flex items-center justify-between gap-3 bg-black/20 rounded-2xl p-3 sm:p-5"
          >
            <div>
              <p className="text-lg sm:text-2xl font-semibold">
                {item.name}{" "}
                <span className="text-gray-400">x{item.quantity}</span>
              </p>
              {item.toppings.length > 0 && (
                <p className="text-sm sm:text-lg text-gray-400 mt-1">
                  {item.toppings.map((topping) => topping.name).join(", ")}
                </p>
              )}
            </div>
            <p className="text-lg sm:text-2xl font-bold text-primary-light shrink-0">
              ฿{lineTotal(item).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 mt-4 sm:mt-6 pt-4 sm:pt-6 flex items-center justify-between gap-3">
        <p className="text-lg sm:text-2xl text-gray-300">
          {snapshot?.itemCount} {t("items")}
        </p>
        <p className="text-3xl sm:text-5xl font-bold text-primary-light">
          ฿{(snapshot?.total ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
