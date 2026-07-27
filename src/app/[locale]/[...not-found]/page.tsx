"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CatchAllNotFound() {
  const params = useParams();
  const locale = (params.locale as string) || "th";
  const t = useTranslations("notFound");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-primary to-primary-light rounded-full mb-6 shadow-lg shadow-primary/30">
            <FileQuestion className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            {t("title")}
          </h2>
          <p className="text-lg text-gray-600 mb-4">{t("subtitle")}</p>
          <p className="text-sm text-gray-500">{t("description")}</p>
        </div>

        <div className="space-y-4">
          <Link
            href={`/${locale}`}
            className="block w-full rounded-xl bg-gradient-to-r from-primary to-primary-light px-6 py-3 text-sm font-semibold text-white hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {t("backHome")}
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="block w-full rounded-xl border-2 border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-all duration-200"
          >
            {t("goToDashboard")}
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">{t("contact")}</p>
      </div>
    </div>
  );
}
