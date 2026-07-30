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
      <div className="h-screen flex flex-col items-center justify-center bg-primary-dark text-white p-8">
        <h1 className="text-3xl font-bold mb-8">{t("selectBranch")}</h1>
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
      <div className="h-screen flex flex-col bg-primary-dark text-white p-8">
        <div className="flex items-center justify-between">
          <p className="text-lg text-gray-400">{t("paying")}</p>
          <p className="text-lg text-gray-400">
            {snapshot?.itemCount} {t("items")}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center gap-16">
          <div className="bg-white p-8 rounded-2xl shadow-2xl shrink-0">
            {payment.qrImageUrl ? (
              // Sized larger than the checkout modal's own QR (240px) —
              // this screen is meant to be read from normal standing
              // distance across a counter, not held in the hand.
              <div className="relative w-96 h-96">
                <Image
                  src={payment.qrImageUrl}
                  alt={t("scanInstruction")}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <QRCode value={payment.qrPayload ?? ""} size={384} />
            )}
          </div>
          <div className="text-left max-w-xs">
            <p className="text-xl text-gray-400 mb-2">{t("amountDue")}</p>
            <p className="text-6xl font-bold text-primary-light mb-6">
              ฿{payment.amount.toLocaleString()}
            </p>
            <p className="text-lg text-gray-300 mb-6">{t("scanInstruction")}</p>
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
      <div className="h-screen flex flex-col items-center justify-center bg-primary-dark text-white gap-3">
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-2">
          <Check className="w-10 h-10 text-gray-900" strokeWidth={3} />
        </div>
        <p className="text-4xl font-bold">{t("successTitle")}</p>
        <p className="text-xl text-gray-400">{t("successSubtitle")}</p>
        <p className="text-lg text-primary-light font-semibold mt-2">
          ฿{payment.amount.toLocaleString()}
          {payment.saleNumber ? ` · ${payment.saleNumber}` : ""}
        </p>
      </div>
    );
  }

  const items = snapshot?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-primary-dark text-white">
        <ShoppingBag className="w-24 h-24 text-gray-600 mb-6" />
        <p className="text-4xl font-bold text-gray-300">{t("idleTitle")}</p>
        <p className="text-xl text-gray-500 mt-2">{t("idleSubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-primary-dark text-white p-8">
      <h1 className="text-3xl font-bold mb-6">{t("currentOrder")}</h1>

      <div className="flex-1 overflow-y-auto space-y-4">
        {items.map((item) => (
          <div
            key={item.lineId}
            className="flex items-center justify-between bg-black/20 rounded-2xl p-5"
          >
            <div>
              <p className="text-2xl font-semibold">
                {item.name}{" "}
                <span className="text-gray-400">x{item.quantity}</span>
              </p>
              {item.toppings.length > 0 && (
                <p className="text-lg text-gray-400 mt-1">
                  {item.toppings.map((topping) => topping.name).join(", ")}
                </p>
              )}
            </div>
            <p className="text-2xl font-bold text-primary-light">
              ฿{lineTotal(item).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 mt-6 pt-6 flex items-center justify-between">
        <p className="text-2xl text-gray-300">
          {snapshot?.itemCount} {t("items")}
        </p>
        <p className="text-5xl font-bold text-primary-light">
          ฿{(snapshot?.total ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
