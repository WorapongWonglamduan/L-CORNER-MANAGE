import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DetailRowProps {
  label: string;
  value: ReactNode;
  /** First row in a card has no top divider — every row after it does. */
  bordered?: boolean;
}

export function DetailRow({ label, value, bordered = true }: DetailRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5",
        bordered && "border-t border-gray-100 dark:border-gray-700",
      )}
    >
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}:</span>
      <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
