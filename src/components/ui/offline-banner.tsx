"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConnectivity } from "@/hooks/useConnectivity";

// Full-screen, non-dismissible notice — the app has no offline write queue
// (see the sales flow's server-side stock/price/promo checks), so nothing
// behind this overlay can be safely used until connectivity is confirmed
// back, not just until the user says so.
export function OfflineBanner() {
  const t = useTranslations("connectivity");
  const { isOnline, retryNow } = useConnectivity();

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-100 bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{t("offlineTitle")}</h1>
      <p className="text-gray-300 max-w-md mb-6">{t("offlineMessage")}</p>
      <Button onClick={retryNow} variant="secondary">
        {t("retry")}
      </Button>
    </div>
  );
}
