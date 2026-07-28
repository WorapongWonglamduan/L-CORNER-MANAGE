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
  isSameDay,
  isSameMonth,
  parseISO,
  isValid,
  type Locale,
} from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
  baseInputClass?: string;
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
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          baseInputClass,
          "flex items-center justify-between text-left",
          !value && "text-gray-400",
        )}
      >
        <span className="truncate">
          {selected ? format(selected, "d MMM yyyy", { locale }) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
      </button>

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-20 mt-1 rounded-xl border-2 border-gray-200 bg-white shadow-lg p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {format(viewMonth, "MMMM yyyy", { locale })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
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
                    !isSameMonth(day, viewMonth) && "text-gray-300",
                    isSelected
                      ? "bg-primary text-white font-semibold hover:bg-primary"
                      : "hover:bg-gray-100 text-gray-700",
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
}: DateRangePickerProps) {
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;
  const minEndDate = toDate(startDate);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
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
  );
}
