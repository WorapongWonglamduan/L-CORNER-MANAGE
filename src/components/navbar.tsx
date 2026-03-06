"use client";

import { LogOut, Settings, LayoutDashboard, ShoppingCart, Package, FileText, Warehouse } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { theme } from "@/lib/theme";

interface NavbarProps {
  userName?: string;
}

export function Navbar({ userName }: NavbarProps) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const tSettings = useTranslations("settings");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const [lowStockCount, setLowStockCount] = useState(0);

  const fetchLowStockCount = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory/low-stock");
      if (!response.ok) return;
      const data = await response.json();
      setLowStockCount(data.items?.length || 0);
    } catch (error) {
      console.error("Error fetching low stock count:", error);
    }
  }, []);

  useEffect(() => {
    const initialFetch = async () => {
      await fetchLowStockCount();
    };
    initialFetch();
    
    const interval = setInterval(fetchLowStockCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const navItems = [
    { href: `/${locale}/dashboard`, label: tNav("dashboard"), icon: LayoutDashboard },
    { href: `/${locale}/pos`, label: tNav("pos"), icon: ShoppingCart },
    { href: `/${locale}/sales`, label: tNav("sales"), icon: FileText },
    { href: `/${locale}/products/list`, label: tNav("products"), icon: Package },
    { href: `/${locale}/inventory`, label: tNav("inventory"), icon: Warehouse, badge: lowStockCount },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className={`${theme.gradients.primary} ${theme.shadows.lg}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-white">L</span>
              </div>
              <div
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="cursor-pointer"
              >
                <h1 className="text-xl font-bold text-white">{t("title")}</h1>
                <p className="text-sm text-blue-100">
                  {t("welcome")},{" "}
                  <span className="font-semibold text-white">{userName}</span>
                </p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const hasBadge = item.badge && item.badge > 0;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                      active
                        ? "bg-white text-[#213559] font-semibold shadow-lg"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs lg:text-sm">{item.label}</span>
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => router.push(`/${locale}/settings`)}
              className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs lg:text-sm font-medium hidden sm:inline">{tSettings("title")}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs lg:text-sm font-medium hidden sm:inline">{tAuth("logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
