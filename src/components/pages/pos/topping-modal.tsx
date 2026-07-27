"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";
import type { SelectedTopping } from "./helper";

interface ToppingSelectionValues {
  selectedIds: string[];
}

interface ToppingOption {
  id: string;
  name_i18n: { th: string; en: string };
  price: number;
}

interface ToppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
  locale: Locale;
  onConfirm: (toppings: SelectedTopping[]) => void;
}

export function ToppingModal({
  isOpen,
  onClose,
  productId,
  productName,
  locale,
  onConfirm,
}: ToppingModalProps) {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ToppingOption[]>([]);
  const { watch, setValue, reset } = useForm<ToppingSelectionValues>({
    defaultValues: { selectedIds: [] },
  });
  const selectedIds = watch("selectedIds");

  useEffect(() => {
    if (!isOpen || !productId) return;

    reset({ selectedIds: [] });
    setLoading(true);
    fetch(`/api/toppings?product_id=${productId}&isActive=true&pageSize=50`)
      .then((res) => res.json())
      .then((data) => setOptions(data.items || []))
      .catch((error) => console.error("Error fetching toppings:", error))
      .finally(() => setLoading(false));
  }, [isOpen, productId, reset]);

  if (!isOpen) return null;

  const toggleTopping = (id: string) => {
    setValue(
      "selectedIds",
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const handleConfirm = () => {
    const toppings: SelectedTopping[] = options
      .filter((opt) => selectedIds.includes(opt.id))
      .map((opt) => ({
        id: opt.id,
        name: opt.name_i18n[locale],
        price: Number(opt.price),
      }));
    onConfirm(toppings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {t("customizeTitle", { productName })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <label className="block text-sm font-semibold text-gray-700">
            {t("selectToppings")}
          </label>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 text-gray-500">{t("loadingToppings")}</span>
            </div>
          ) : options.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {t("noToppingsAvailable")}
            </p>
          ) : (
            <div className="space-y-2">
              {options.map((opt) => {
                const selected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleTopping(opt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          selected
                            ? "bg-gradient-to-r from-primary to-primary-light border-primary"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="font-medium text-gray-900">
                        {opt.name_i18n[locale]}
                      </span>
                    </div>
                    <span className="font-semibold text-primary">
                      +฿{Number(opt.price).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-6 text-lg font-semibold"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary to-primary-light text-white py-6 text-lg font-bold"
            >
              {t("addWithToppings")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
