"use client";

import { Sidebar } from "@/components/sidebar";
import { useTranslations } from "next-intl";
import { Package, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ProductsManager from "./products-manager";

export default function ProductsContent() {
  const t = useTranslations("settings.products");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar />

      <div className="flex-1 p-4 pt-20 md:pt-6 sm:p-6 lg:p-8 overflow-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">กลับ</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-primary to-primary-light p-2 rounded-lg shadow-lg shadow-primary/30 shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">{t("title")}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{t("description")}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
          <ProductsManager />
        </div>
      </div>
    </div>
  );
}
