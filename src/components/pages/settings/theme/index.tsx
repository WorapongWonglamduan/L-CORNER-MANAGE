"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useTranslations } from "next-intl";
import { Palette, ArrowLeft, Check, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { THEME_PRESETS } from "@/constants/theme-presets";
import { toast } from "@/lib/toast";
import { useLocale } from "next-intl";
import type { Locale } from "@/types/i18n";
import { deriveThemeShades, contrastRatioWithWhite } from "@/lib/color-utils";

const DEFAULT_CUSTOM_COLOR = "#213559";
// Below this contrast ratio against white, white button/gradient text starts
// getting hard to read (WCAG AA for normal text is 4.5, but these are large
// bold labels/icons, so this is a softer heads-up, not a hard block).
const LOW_CONTRAST_THRESHOLD = 2.5;

export default function ThemeContent() {
  const t = useTranslations("theme");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [currentColor, setCurrentColor] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customColorInput, setCustomColorInput] =
    useState(DEFAULT_CUSTOM_COLOR);
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    fetch("/api/settings/theme")
      .then((res) => res.json())
      .then((data) => {
        setCurrentColor(data.theme_color);
        setCustomColorInput(data.theme_color);
      })
      .catch((error) => console.error("Error fetching theme settings:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (presetId: string, themeColor: string) => {
    setSavingId(presetId);
    try {
      const response = await fetch("/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save theme");
      }

      setCurrentColor(themeColor);
      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error(error instanceof Error ? error.message : t("saveSuccess"));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveCustom = async () => {
    setSavingCustom(true);
    try {
      const response = await fetch("/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_color: customColorInput }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save theme");
      }

      setCurrentColor(customColorInput);
      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (error) {
      console.error("Error saving custom theme color:", error);
      toast.error(error instanceof Error ? error.message : t("saveSuccess"));
    } finally {
      setSavingCustom(false);
    }
  };

  const customShades = deriveThemeShades(customColorInput);
  const isLowContrast =
    contrastRatioWithWhite(customColorInput) < LOW_CONTRAST_THRESHOLD;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">กลับ</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-primary to-primary-light p-2 rounded-lg shadow-lg shadow-primary/30">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          </div>
          <p className="text-gray-600">{t("description")}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            {t("choosePreset")}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {THEME_PRESETS.map((preset) => {
                const isActive = currentColor === preset.theme_color;
                const isSaving = savingId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset.id, preset.theme_color)}
                    disabled={isSaving}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg disabled:opacity-60 ${
                      isActive
                        ? "border-gray-900 shadow-lg"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className="h-16 rounded-lg mb-3 shadow-inner"
                      style={{
                        background: `linear-gradient(to right, ${preset.theme_color}, ${preset.theme_color_light})`,
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">
                        {preset.name_i18n[locale]}
                      </span>
                      {isActive && (
                        <span className="bg-gray-900 text-white rounded-full p-1">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t("applied")}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mt-6">
          <p className="text-sm font-semibold text-gray-700">
            {t("customColor")}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t("customColorDescription")}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input
              type="color"
              value={customColorInput}
              onChange={(e) => setCustomColorInput(e.target.value)}
              className="w-16 h-16 rounded-lg border border-gray-200 cursor-pointer"
              aria-label={t("pickColor")}
            />

            <div
              className="h-16 flex-1 rounded-lg shadow-inner min-w-40"
              style={{
                background: `linear-gradient(to right, ${customShades.theme_color}, ${customShades.theme_color_light})`,
              }}
            />

            <button
              onClick={handleSaveCustom}
              disabled={savingCustom}
              className="shrink-0 bg-gradient-to-r from-primary to-primary-light text-white px-5 py-3 rounded-lg font-semibold shadow-lg shadow-primary/30 hover:shadow-xl transition-all disabled:opacity-60"
            >
              {savingCustom ? t("saving") : t("useCustomColor")}
            </button>
          </div>

          {isLowContrast && (
            <div className="flex items-start gap-2 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                {t("lowContrastWarning")}
              </p>
            </div>
          )}

          {currentColor === customColorInput && !loading && (
            <p className="text-xs text-gray-500 mt-3">{t("applied")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
