"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eye, EyeOff, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import type { I18nText, Locale } from "@/types/i18n";

interface WarehouseVisibility {
  warehouse_id: string;
  code: string;
  name_i18n: I18nText;
  current_stock: number;
  is_active: boolean;
}

interface WarehouseVisibilityModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WarehouseVisibilityModal({
  productId,
  productName,
  isOpen,
  onClose,
}: WarehouseVisibilityModalProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("settings.products.warehouses");
  const [items, setItems] = useState<WarehouseVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}/warehouses`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching product warehouses:", error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen) fetchWarehouses();
  }, [isOpen, fetchWarehouses]);

  const handleToggle = async (item: WarehouseVisibility) => {
    const nextActive = !item.is_active;
    if (!nextActive && item.current_stock !== 0) {
      toast.error(t("hideRequiresZeroStock"));
      return;
    }

    setSavingId(item.warehouse_id);
    try {
      const response = await fetch(
        `/api/products/${productId}/warehouses/${item.warehouse_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: nextActive }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update");
      }

      setItems((prev) =>
        prev.map((w) =>
          w.warehouse_id === item.warehouse_id
            ? { ...w, is_active: nextActive }
            : w,
        ),
      );
      toast.success(nextActive ? t("restoreSuccess") : t("hideSuccess"));
    } catch (error) {
      console.error("Error updating product warehouse visibility:", error);
      toast.error(t("updateError"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl font-bold">
            {t("title")}
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">{productName}</p>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Package className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                {t("noWarehouseAssigned")}
              </p>
            </div>
          ) : (
            items.map((item) => {
              const hideDisabled = item.is_active && item.current_stock !== 0;
              return (
                <div
                  key={item.warehouse_id}
                  className="flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                      {item.name_i18n[locale]}{" "}
                      <span className="text-gray-500 dark:text-gray-400">({item.code})</span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item.is_active ? t("visible") : t("hidden")}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("currentStock")}: {item.current_stock.toLocaleString()}
                    </p>
                    {hideDisabled && (
                      <p className="text-xs text-orange-600">
                        {t("hideRequiresZeroStock")}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={savingId === item.warehouse_id || hideDisabled}
                    variant={item.is_active ? "outline" : "default"}
                    size="sm"
                    className={
                      item.is_active
                        ? "text-red-600 hover:text-red-700 shrink-0"
                        : "bg-gradient-to-r from-primary to-primary-light text-white shrink-0"
                    }
                  >
                    {item.is_active ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        {t("hide")}
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        {t("restore")}
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
