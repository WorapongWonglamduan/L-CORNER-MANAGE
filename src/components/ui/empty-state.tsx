import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  label: string;
  bordered?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, label, bordered = true, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        bordered && "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg",
        className,
      )}
    >
      <Icon className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
      <p className="text-gray-600 dark:text-gray-300 text-lg text-center">{label}</p>
    </div>
  );
}
