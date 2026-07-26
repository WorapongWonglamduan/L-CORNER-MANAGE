"use client";

import { Sidebar } from "@/components/sidebar";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { useHasAnyPermission } from "@/hooks/usePermission";
import {
  Settings,
  Package,
  ArrowRight,
  Beef,
  FolderTree,
  Folder,
  IceCreamCone,
  Tag,
  Users,
  ShieldCheck,
  Warehouse,
  Palette,
} from "lucide-react";

export default function SettingsContent() {
  const t = useTranslations("settings");
  const tToppings = useTranslations("toppings");
  const tPromotions = useTranslations("promotions");
  const tUsers = useTranslations("users");
  const tRoles = useTranslations("roles");
  const tWarehouses = useTranslations("warehouses");
  const tTheme = useTranslations("theme");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const canManageUsers = useHasAnyPermission(["users.view"]);
  const canManageSettings = useHasAnyPermission(["settings.view"]);

  const settingCards = [
    {
      id: "units",
      title: t("units.title"),
      description: t("units.description"),
      icon: Package,
      href: `/${locale}/settings/units`,
    },
    {
      id: "categories",
      title: t("categories.title"),
      description: t("categories.description"),
      icon: Folder,
      href: `/${locale}/settings/categories`,
    },
    {
      id: "raw-materials",
      title: t("rawMaterials.title"),
      description: t("rawMaterials.description"),
      icon: Beef,
      href: `/${locale}/settings/raw-materials`,
    },
    {
      id: "product-types",
      title: t("productTypes.title"),
      description: t("productTypes.description"),
      icon: FolderTree,
      href: `/${locale}/settings/product-types`,
    },
    {
      id: "toppings",
      title: tToppings("title"),
      description: tToppings("description"),
      icon: IceCreamCone,
      href: `/${locale}/settings/toppings`,
    },
    {
      id: "promotions",
      title: tPromotions("title"),
      description: tPromotions("description"),
      icon: Tag,
      href: `/${locale}/settings/promotions`,
    },
    ...(canManageUsers
      ? [
          {
            id: "users",
            title: tUsers("title"),
            description: tUsers("description"),
            icon: Users,
            href: `/${locale}/settings/users`,
          },
          {
            id: "roles",
            title: tRoles("title"),
            description: tRoles("description"),
            icon: ShieldCheck,
            href: `/${locale}/settings/roles`,
          },
        ]
      : []),
    ...(canManageSettings
      ? [
          {
            id: "warehouses",
            title: tWarehouses("title"),
            description: tWarehouses("description"),
            icon: Warehouse,
            href: `/${locale}/settings/warehouses`,
          },
          {
            id: "theme",
            title: tTheme("title"),
            description: tTheme("description"),
            icon: Palette,
            href: `/${locale}/settings/theme`,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex">
      <Sidebar />

      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-primary to-primary-light p-2 rounded-lg shadow-lg shadow-primary/30">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("pageTitle")}</h1>
          </div>
          <p className="text-gray-600">{t("pageDescription")}</p>
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
                  <div className="bg-gradient-to-r from-primary to-primary-light w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
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
