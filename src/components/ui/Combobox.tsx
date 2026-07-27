"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useMemo,
  useImperativeHandle,
  useId,
} from "react";
import { FieldError, FieldErrors } from "react-hook-form";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  label?: string;
  error?: FieldError | string | FieldErrors;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
  className?: string;
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  id?: string;
}

// Searchable single-select dropdown — same visual shell as the shared
// `Input` component (label/error/helperText), but with a type-to-filter
// list instead of a plain native <select>. Built for option lists too long
// to scan by scrolling (e.g. product pickers).
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      containerClassName,
      className,
      options,
      value,
      onChange,
      onBlur,
      placeholder = "-- เลือก --",
      searchPlaceholder = "พิมพ์เพื่อค้นหา...",
      noResultsText = "ไม่พบรายการ",
      disabled,
      id,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const selectedOption = options.find((o) => o.value === value);

    const filteredOptions = useMemo(() => {
      if (!query) return options;
      const q = query.toLowerCase();
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setQuery("");
          onBlur?.();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onBlur]);

    useEffect(() => {
      setHighlightedIndex(0);
    }, [query]);

    const errorMessage: string | undefined =
      typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : undefined;

    const openDropdown = () => {
      if (disabled) return;
      setIsOpen(true);
      setQuery("");
    };

    const selectOption = (option: ComboboxOption) => {
      onChange(option.value);
      setIsOpen(false);
      setQuery("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        // Open on an explicit action only — Enter/ArrowDown/Space, or typing
        // a character to search — never on bare focus (matches native
        // <select>; also avoids react-hook-form's focus-the-invalid-field
        // behavior on failed submit popping this open unrequested).
        if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
          e.preventDefault();
          openDropdown();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          openDropdown();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option) selectOption(option);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
      }
    };

    const baseInputClass = cn(
      theme.inputs.default,
      "cursor-pointer pr-10",
      errorMessage && "border-red-500 focus:border-red-500",
      className,
    );

    return (
      <div className={containerClassName} ref={containerRef}>
        {label && (
          <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            disabled={disabled}
            className={baseInputClass}
            value={isOpen ? query : selectedOption?.label ?? ""}
            placeholder={isOpen ? searchPlaceholder : placeholder}
            onClick={openDropdown}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <ChevronDown
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-transform",
              isOpen && "rotate-180",
            )}
          />

          {isOpen && (
            <div
              id={listboxId}
              role="listbox"
              className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border-2 border-gray-200 bg-white shadow-lg"
            >
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">{noResultsText}</div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    key={option.value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors",
                      index === highlightedIndex && "bg-gray-50",
                      option.value === value && "font-semibold text-primary",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errorMessage}
          </p>
        )}

        {helperText && !errorMessage && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Combobox.displayName = "Combobox";
