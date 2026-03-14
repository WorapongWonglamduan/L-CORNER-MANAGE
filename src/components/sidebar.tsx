"use client";

import {
  LogOut,
  Settings,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Warehouse,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { theme } from "@/lib/theme";
import { ROUTES } from "@/constants/routes";

interface SidebarProps {
  userName?: string;
}

export function Sidebar({ userName }: SidebarProps) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const tSettings = useTranslations("settings");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const [isCollapsed, setIsCollapsed] = useState(false);
  // const [lowStockCount] = useState(0);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push(ROUTES.LOGIN(locale));
    router.refresh();
  };

  const navItems = [
    {
      href: ROUTES.DASHBOARD(locale),
      label: tNav("dashboard"),
      icon: LayoutDashboard,
    },
    { href: ROUTES.POS(locale), label: tNav("pos"), icon: ShoppingCart },
    { href: ROUTES.SALES(locale), label: tNav("sales"), icon: FileText },
    {
      href: ROUTES.PRODUCTS.LIST(locale),
      label: tNav("products"),
      icon: Package,
    },
    {
      href: ROUTES.INVENTORY(locale),
      label: tNav("inventory"),
      icon: Warehouse,
      // badge: lowStockCount,
    },
    {
      href: ROUTES.SETTINGS.INDEX(locale),
      label: tSettings("title"),
      icon: Settings,
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen ${theme.gradients.primary} ${
          theme.shadows.xl
        } transition-all duration-300 z-50 flex flex-col ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">L</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{t("title")}</h1>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">L</span>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-white/10">
            <p className="text-sm text-blue-100">
              {t("welcome")},{" "}
              <span className="font-semibold text-white">{userName}</span>
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            // const hasBadge = item.badge && item.badge > 0;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? "bg-white text-[#213559] font-semibold shadow-lg"
                    : "text-white hover:bg-white/10"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
                {/* {hasBadge && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                    {item.badge}
                  </span>
                )} */}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {/* Language Switcher */}
          <LanguageSwitcher isCollapsed={isCollapsed} />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? tAuth("logout") : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">{tAuth("logout")}</span>
            )}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-[#213559] hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Spacer for content */}
      <div className={`${isCollapsed ? "w-20" : "w-64"} shrink-0`} />
    </>
  );
}
