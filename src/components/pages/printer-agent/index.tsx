"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  FlaskConical,
  Printer,
  RefreshCw,
} from "lucide-react";
import type { Locale } from "@/types/i18n";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { renderReceiptToRaster } from "@/lib/receipt/render";
import type { PaperWidth } from "@/lib/receipt/types";
import type { PrintJob } from "@/lib/print-job-bus";

interface AgentWarehouse {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
}

interface JobLogEntry {
  job: PrintJob;
  status: "success" | "error";
  error?: string;
  timestamp: string;
  previewDataUrl?: string;
}

const MAX_JOB_LOG = 20;

export default function PrinterAgentContent() {
  const t = useTranslations("printerAgent");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const warehouseId = searchParams.get("warehouseId");
  const [warehouses, setWarehouses] = useState<AgentWarehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [jobLog, setJobLog] = useState<JobLogEntry[]>([]);
  const [previewEntry, setPreviewEntry] = useState<JobLogEntry | null>(null);

  const { status, pairedDevice, pair, pairMock, disconnect, print, setPaperWidth } =
    useThermalPrinter();

  useEffect(() => {
    if (warehouseId) return;
    const assignedWarehouseIds = session?.user?.warehouse_ids ?? [];
    if (assignedWarehouseIds.length === 0) return;

    const fetchWarehouses = async () => {
      try {
        setLoadingWarehouses(true);
        const res = await fetch("/api/warehouses?pageSize=100&isActive=true");
        const data = await res.json();
        const items: AgentWarehouse[] = data.items || [];
        setWarehouses(items.filter((w) => assignedWarehouseIds.includes(w.id)));
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, [warehouseId, session?.user?.warehouse_ids]);

  const runJob = useCallback(
    async (job: PrintJob) => {
      // Rendered outside the try/catch that guards the actual print, so a
      // preview is still available in the log even when the printer write
      // itself fails (useful both for real hardware debugging and for the
      // mock/no-hardware flow, where "printing" never touches Bluetooth).
      let previewDataUrl: string | undefined;
      try {
        const rendered = renderReceiptToRaster(job.payload, {
          paperWidth: pairedDevice?.paperWidth ?? "58",
          locale,
        });
        previewDataUrl = rendered.previewDataUrl;
        await print(rendered.bytes);
        setJobLog((prev) =>
          [
            {
              job,
              status: "success" as const,
              timestamp: new Date().toISOString(),
              previewDataUrl,
            },
            ...prev,
          ].slice(0, MAX_JOB_LOG),
        );
        toast.success(t("printSuccess", { saleNumber: job.saleNumber }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setJobLog((prev) =>
          [
            {
              job,
              status: "error" as const,
              error: message,
              timestamp: new Date().toISOString(),
              previewDataUrl,
            },
            ...prev,
          ].slice(0, MAX_JOB_LOG),
        );
        toast.error(t("printError", { saleNumber: job.saleNumber, message }));
      }
    },
    [pairedDevice, locale, print, t],
  );

  // Keeps the SSE subscription itself stable across renders (only
  // warehouseId should re-open the connection) while still calling the
  // latest runJob, which closes over pairedDevice/print.
  const runJobRef = useRef(runJob);
  useEffect(() => {
    runJobRef.current = runJob;
  }, [runJob]);

  useEffect(() => {
    if (!warehouseId) return;

    const eventSource = new EventSource(
      `/api/pos/print-jobs?warehouseId=${warehouseId}`,
    );
    eventSource.onmessage = (event) => {
      const job = JSON.parse(event.data) as PrintJob;
      runJobRef.current(job);
    };

    return () => eventSource.close();
  }, [warehouseId]);

  // Builds a fake sale so the full render → print pipeline can be exercised
  // (including Thai wrapping/layout) without needing to run an actual
  // checkout, on top of the mock-printer connection covering the Bluetooth
  // side.
  const handleTestPrint = useCallback(() => {
    runJob({
      id: crypto.randomUUID(),
      saleId: "test",
      saleNumber: "TEST-0001",
      createdAt: new Date().toISOString(),
      payload: {
        sale_number: "TEST-0001",
        sale_date: new Date().toISOString(),
        subtotal: 145,
        discount_amount: 15,
        tax_amount: 0,
        total_amount: 130,
        payment_method: "cash",
        promotion_code: "WELCOME10",
        warehouse: {
          code: "MAIN",
          name_i18n: { th: "สาขาทดสอบ ถนนสุขุมวิท", en: "Test Branch" },
          address: "123 ถนนสุขุมวิท กรุงเทพมหานคร 10110",
        },
        items: [
          {
            quantity: 2,
            unit_price: 45,
            total_amount: 90,
            product: { name_i18n: { th: "ชาไทยเย็นใส่ไข่มุกและวุ้นมะพร้าว", en: "Thai Iced Tea" } },
            toppings: [
              {
                quantity: 2,
                unit_price: 10,
                topping: { name_i18n: { th: "ไข่มุก", en: "Pearls" } },
              },
            ],
          },
          {
            quantity: 1,
            unit_price: 55,
            total_amount: 55,
            product: { name_i18n: { th: "กาแฟลาเต้ร้อน", en: "Hot Latte" } },
            toppings: [],
          },
        ],
      },
    });
  }, [runJob]);

  if (!warehouseId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        <Sidebar />
        <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            {t("selectBranch")}
          </h1>
          {loadingWarehouses ? (
            <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>
          ) : warehouses.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t("noWarehouseAssigned")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {warehouses.map((w) => (
                <button
                  key={w.id}
                  onClick={() => router.push(`${pathname}?warehouseId=${w.id}`)}
                  className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow text-left"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">{w.code}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {w.name_i18n[locale]}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const statusMeta: Record<
    typeof status,
    { icon: typeof Bluetooth; className: string; label: string }
  > = {
    unsupported: { icon: BluetoothOff, className: "text-gray-400 dark:text-gray-500", label: t("statusUnsupported") },
    disconnected: { icon: BluetoothOff, className: "text-gray-500 dark:text-gray-400", label: t("statusDisconnected") },
    connecting: { icon: Bluetooth, className: "text-amber-500 dark:text-amber-400", label: t("statusConnecting") },
    connected: { icon: BluetoothConnected, className: "text-emerald-600 dark:text-emerald-400", label: t("statusConnected") },
    error: { icon: CircleAlert, className: "text-red-600 dark:text-red-400", label: t("statusError") },
  };
  const StatusIcon = statusMeta[status].icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar />
      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t("back")}</span>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-primary to-primary-light p-2 rounded-lg shadow-lg shadow-primary/30">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-6 h-6 ${statusMeta[status].className}`} />
              <div>
                <p className={`font-semibold ${statusMeta[status].className}`}>
                  {statusMeta[status].label}
                  {pairedDevice?.isMock && (
                    <span className="ml-2 align-middle text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                      {t("mockBadge")}
                    </span>
                  )}
                </p>
                {pairedDevice && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pairedDevice.isMock
                      ? t("pairedAsMock")
                      : t("pairedAs", { name: pairedDevice.deviceName })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {status === "connected" ? (
                <Button variant="outline" onClick={disconnect}>
                  {t("disconnect")}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={pair}
                    disabled={status === "unsupported"}
                  >
                    {pairedDevice ? t("reconnect") : t("connect")}
                  </Button>
                  <Button variant="outline" onClick={pairMock}>
                    <FlaskConical className="w-4 h-4" />
                    {t("connectMock")}
                  </Button>
                </>
              )}
            </div>
          </div>

          {status === "unsupported" && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              {t("bluetoothUnsupported")}
            </p>
          )}

          {pairedDevice && (
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("paperWidth")}
              </span>
              {(["58", "80"] as PaperWidth[]).map((width) => (
                <button
                  key={width}
                  onClick={() => setPaperWidth(width)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    pairedDevice.paperWidth === width
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {width}mm
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("recentJobs")}
            </p>
            <Button variant="outline" size="sm" onClick={handleTestPrint}>
              {t("testPrint")}
            </Button>
          </div>
          {jobLog.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("noJobsYet")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {jobLog.map((entry) => (
                <li
                  key={`${entry.job.id}-${entry.timestamp}`}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {entry.status === "success" ? (
                      <CircleCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <CircleX className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {entry.job.saleNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleTimeString(locale)}
                        {entry.error ? ` · ${entry.error}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.previewDataUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewEntry(entry)}
                      >
                        <Eye className="w-4 h-4" />
                        {t("preview")}
                      </Button>
                    )}
                    {entry.status === "error" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runJob(entry.job)}
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t("retry")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={previewEntry !== null}
        onOpenChange={(open) => !open && setPreviewEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {previewEntry ? previewEntry.job.saleNumber : ""}
            </DialogTitle>
          </DialogHeader>
          {previewEntry?.previewDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewEntry.previewDataUrl}
              alt={previewEntry.job.saleNumber}
              className="w-full max-w-xs mx-auto border border-gray-200 dark:border-gray-600 rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
