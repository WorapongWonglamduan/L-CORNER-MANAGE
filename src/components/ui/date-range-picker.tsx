"use client";

import { Calendar, X } from "lucide-react";

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
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Start Date */}
      <div className="relative">
        {/* <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Calendar className="w-5 h-5" />
        </div> */}
        <input
          type="date"
          className={baseInputClass}
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          placeholder={startPlaceholder}
        />
        {startDate && (
          <button
            onClick={() => onStartDateChange("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* End Date */}
      <div className="relative">
        {/* <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Calendar className="w-5 h-5" />
        </div> */}
        <input
          type="date"
          className={baseInputClass}
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          placeholder={endPlaceholder}
          min={startDate || undefined}
        />
        {endDate && (
          <button
            onClick={() => onEndDateChange("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
