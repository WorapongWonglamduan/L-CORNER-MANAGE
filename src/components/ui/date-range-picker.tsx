"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  subDays,
  subYears,
  isSameDay,
  isSameMonth,
  parseISO,
  isValid,
  type Locale,
} from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRangePresetOption {
  key: string;
  label: string;
  /** Ignored for the "custom" key — clicking it always clears the range instead. */
  range: () => { startDate: string; endDate: string };
}

/** Trailing windows ending today, plus a "custom" chip for manual picking.
 * `t` receives keys like "dateRangePresets.today" — pass a translator
 * scoped to a namespace that has that shape (see `common` in i18n/messages). */
export function getDefaultDateRangePresets(
  t: (key: string) => string,
): DateRangePresetOption[] {
  const todayStr = () => format(new Date(), "yyyy-MM-dd");
  return [
    {
      key: "today",
      label: t("dateRangePresets.today"),
      range: () => ({ startDate: todayStr(), endDate: todayStr() }),
    },
    {
      key: "last7Days",
      label: t("dateRangePresets.last7Days"),
      range: () => ({
        startDate: format(subDays(new Date(), 6), "yyyy-MM-dd"),
        endDate: todayStr(),
      }),
    },
    {
      key: "last1Month",
      label: t("dateRangePresets.last1Month"),
      range: () => ({
        startDate: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
        endDate: todayStr(),
      }),
    },
    {
      key: "last1Year",
      label: t("dateRangePresets.last1Year"),
      range: () => ({
        startDate: format(subYears(new Date(), 1), "yyyy-MM-dd"),
        endDate: todayStr(),
      }),
    },
    {
      key: "custom",
      label: t("dateRangePresets.custom"),
      range: () => ({ startDate: "", endDate: "" }),
    },
  ];
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
  baseInputClass?: string;
  presets?: DateRangePresetOption[];
  /** Called instead of onStartDateChange/onEndDateChange for a non-custom preset click, so the caller can apply the filter immediately rather than waiting for an explicit search action. */
  onPresetApply?: (range: { startDate: string; endDate: string }) => void;
}

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

interface DateFieldProps {
  value: string;
  onChange: (date: string) => void;
  placeholder: string;
  baseInputClass?: string;
  minDate?: Date;
  locale: Locale;
}

// A single date field: a formatted-text button (locale-aware month/weekday
// names via date-fns) that opens a small calendar popover — replaces the
// native <input type="date">, whose displayed format follows the browser's
// own locale rather than the app's next-intl one (always "mm/dd/yyyy" in
// most setups regardless of the active language).
export function DateField({
  value,
  onChange,
  placeholder,
  baseInputClass,
  minDate,
  locale,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = toDate(value);
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const openPicker = () => {
    setViewMonth(selected ?? new Date());
    setIsOpen(true);
  };

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdayLabels = eachDayOfInterval({
    start: gridStart,
    end: endOfWeek(gridStart, { weekStartsOn: 0 }),
  }).map((d) => format(d, "EEEEEE", { locale }));

  return (
    <div className="relative" ref={containerRef}>
      {/* A <div role="button"> here, not a <button> — the clear (×) button
          below has to be a real nested <button> for its own click handling,
          and a <button> can't contain another <button> (invalid HTML, and
          the two clicks bubble/collide in confusing ways). Sharing one icon
          slot that swaps calendar↔clear (instead of overlaying a second,
          separately-positioned icon on top) is also what keeps this from
          crowding or overlapping the date text once it's long enough
          ("28 ก.ค. 2026" vs "8 ก.ค. 2026") to reach the icon area. */}
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          baseInputClass,
          "flex items-center justify-between text-left cursor-pointer",
          !value && "text-gray-400 dark:text-gray-500",
        )}
      >
        <span className="truncate">
          {selected ? format(selected, "d MMM yyyy", { locale }) : placeholder}
        </span>
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="shrink-0 ml-2 p-1 -m-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 ml-2" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {format(viewMonth, "MMMM yyyy", { locale })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
            {weekdayLabels.map((label, i) => (
              <div key={i}>{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const disabled = !!minDate && day < minDate;
              const isSelected = !!selected && isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(format(day, "yyyy-MM-dd"));
                    setIsOpen(false);
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg text-sm transition-colors",
                    !isSameMonth(day, viewMonth) && "text-gray-300 dark:text-gray-600",
                    isSelected
                      ? "bg-primary text-white font-semibold hover:bg-primary"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
                    disabled &&
                      "opacity-30 cursor-not-allowed hover:bg-transparent",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "วันที่เริ่มต้น",
  endPlaceholder = "วันที่สิ้นสุด",
  className = "",
  baseInputClass = "",
  presets,
  onPresetApply,
}: DateRangePickerProps) {
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const minEndDate = toDate(startDate);

  // A preset is "active" only once its exact range is in effect; with both
  // fields empty (no filter yet) nothing lights up, and a manually-adjusted
  // range that doesn't match any quick option falls back to "custom".
  const matchedPreset = presets?.find(
    (preset) =>
      preset.key !== "custom" &&
      preset.range().startDate === startDate &&
      preset.range().endDate === endDate,
  );
  const activePresetKey =
    matchedPreset?.key ?? (startDate || endDate ? "custom" : undefined);

  const handlePresetClick = (preset: DateRangePresetOption) => {
    if (preset.key === "custom") {
      onStartDateChange("");
      onEndDateChange("");
      return;
    }
    const range = preset.range();
    if (onPresetApply) {
      onPresetApply(range);
    } else {
      onStartDateChange(range.startDate);
      onEndDateChange(range.endDate);
    }
  };

  return (
    <div className={className}>
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                activePresetKey === preset.key
                  ? "bg-primary text-white border-primary"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateField
          value={startDate}
          onChange={onStartDateChange}
          placeholder={startPlaceholder}
          baseInputClass={baseInputClass}
          locale={dateLocale}
        />
        <DateField
          value={endDate}
          onChange={onEndDateChange}
          placeholder={endPlaceholder}
          baseInputClass={baseInputClass}
          minDate={minEndDate}
          locale={dateLocale}
        />
      </div>
    </div>
  );
}
