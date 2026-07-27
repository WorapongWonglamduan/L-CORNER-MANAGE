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
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // const [lowStockCount] = useState(0);

  // Close the mobile drawer whenever the route changes (e.g. after tapping a nav item)
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const displayName = userName ?? session?.user?.name ?? undefined;
  const roles = session?.user?.roles ?? [];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push(ROUTES.LOGIN(locale));
    router.refresh();
  };

  const allNavItems = [
    {
      href: ROUTES.DASHBOARD(locale),
      label: tNav("dashboard"),
      icon: LayoutDashboard,
      permission: null,
    },
    {
      href: ROUTES.POS(locale),
      label: tNav("pos"),
      icon: ShoppingCart,
      permission: "sales.create",
    },
    {
      href: ROUTES.SALES(locale),
      label: tNav("sales"),
      icon: FileText,
      permission: "sales.view",
    },
    {
      href: ROUTES.PRODUCTS.LIST(locale),
      label: tNav("products"),
      icon: Package,
      permission: "products.view",
    },
    {
      href: ROUTES.INVENTORY(locale),
      label: tNav("inventory"),
      icon: Warehouse,
      permission: "inventory.view",
      // badge: lowStockCount,
    },
    {
      href: ROUTES.SETTINGS.INDEX(locale),
      label: tSettings("title"),
      icon: Settings,
      permission: "settings.view",
    },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile hamburger toggle */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className={`fixed top-4 left-4 z-40 md:hidden w-11 h-11 rounded-full ${theme.gradients.primary} ${theme.shadows.lg} flex items-center justify-center`}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen ${theme.gradients.primary} ${
          theme.shadows.xl
        } transition-transform md:transition-all duration-300 flex flex-col w-64 ${
          // Only needs to outrank other fixed overlays (e.g. the POS bottom
          // cart bar's z-50) while the mobile drawer is actually slid open.
          // At rest — and on desktop, where this div is the permanent nav
          // column rather than a drawer — it must stay below modals (z-50)
          // so dialogs opened from any page aren't covered by the sidebar.
          isMobileOpen ? "z-60" : "z-30"
        } ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div
            className={`flex items-center justify-between ${
              isCollapsed ? "md:justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-white">L</span>
              </div>
              <div className={isCollapsed ? "md:hidden" : ""}>
                <h1 className="text-lg font-bold text-white">{t("title")}</h1>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden text-white/80 hover:text-white p-1"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-white/10 ${isCollapsed ? "md:hidden" : ""}`}>
          <p className="text-sm text-blue-100">
            {t("welcome")},{" "}
            <span className="font-semibold text-white">{displayName}</span>
          </p>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

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
                    ? "bg-white text-primary font-semibold shadow-lg"
                    : "text-white hover:bg-white/10"
                } ${isCollapsed ? "md:justify-center" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={`text-sm ${isCollapsed ? "md:hidden" : ""}`}>
                  {item.label}
                </span>
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
          {/* Language Switcher — always full on mobile; respects isCollapsed only at md+ */}
          <div className={isCollapsed ? "md:hidden" : ""}>
            <LanguageSwitcher isCollapsed={false} />
          </div>
          {isCollapsed && (
            <div className="hidden md:block">
              <LanguageSwitcher isCollapsed={true} />
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors ${
              isCollapsed ? "md:justify-center" : ""
            }`}
            title={isCollapsed ? tAuth("logout") : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`text-sm font-medium ${isCollapsed ? "md:hidden" : ""}`}>
              {tAuth("logout")}
            </span>
          </button>
        </div>

        {/* Toggle Button (desktop only — mobile uses the hamburger/close buttons instead) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white rounded-full shadow-lg items-center justify-center text-primary hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Spacer for content (desktop only — sidebar overlays instead of pushing on mobile) */}
      <div
        className={`hidden md:block shrink-0 ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      />
    </>
  );
}
