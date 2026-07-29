"use client";

import { useToastStore } from "@/lib/toast";
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <XCircle className="w-5 h-5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
      case "error":
        return "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200";
      case "info":
        return "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right ${getStyles(t.type)}`}
        >
          <div className={getIconColor(t.type)}>{getIcon(t.type)}</div>
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
