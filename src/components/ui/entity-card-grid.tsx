import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EntityCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

interface EntityCardProps {
  children: ReactNode;
  className?: string;
}

export function EntityCard({ children, className }: EntityCardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative",
        className,
      )}
    >
      {children}
    </div>
  );
}
