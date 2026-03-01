"use client";

import { Navbar } from "@/components/navbar";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Settings, Package, ArrowRight } from "lucide-react";

export default function SettingsContent() {
  const t = useTranslations("settings");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const settingCards = [
    {
      id: "units",
      title: "จัดการหน่วย",
      description: "จัดการหน่วยวัดสินค้าและการแปลงหน่วย",
      icon: Package,
      href: `/${locale}/settings/units`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-[#213559] to-[#2c4a7a] p-2 rounded-lg shadow-lg shadow-[#213559]/30">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
          </div>
          <p className="text-gray-600">จัดการการตั้งค่าต่างๆ ของระบบ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => router.push(card.href)}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:scale-105 text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-r from-[#213559] to-[#2c4a7a] w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shadow-[#213559]/30">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#213559] transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
