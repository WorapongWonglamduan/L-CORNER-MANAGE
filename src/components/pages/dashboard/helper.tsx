import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Package,
  AlertCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
  LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface StatCard {
  titleKey: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass: string;
}

export interface QuickAction {
  labelKey: string;
  icon: LucideIcon;
  href: string;
  colorClass: string;
}

export const getQuickActions = (locale: string): QuickAction[] => [
  {
    labelKey: "quickActions.newSale",
    icon: ShoppingCart,
    href: ROUTES.POS(locale),
    colorClass: "bg-blue-500 hover:bg-blue-600",
  },
  {
    labelKey: "quickActions.products",
    icon: Package,
    href: ROUTES.PRODUCTS.LIST(locale),
    colorClass: "bg-green-500 hover:bg-green-600",
  },
  {
    labelKey: "quickActions.viewReports",
    icon: BarChart3,
    href: ROUTES.SALES(locale),
    colorClass: "bg-purple-500 hover:bg-purple-600",
  },
  {
    labelKey: "quickActions.manageInventory",
    icon: AlertCircle,
    href: ROUTES.INVENTORY(locale),
    colorClass: "bg-orange-500 hover:bg-orange-600",
  },
];

export const getStatsCards = (data?: {
  todaySales?: { total: number; trend?: { value: string; isPositive: boolean } };
  totalProducts?: number;
  lowStockItems?: number;
  salesCount?: number;
}): StatCard[] => [
  {
    titleKey: "stats.todaySales",
    value: `฿${data?.todaySales?.total?.toLocaleString() || "0"}`,
    icon: DollarSign,
    trend: data?.todaySales?.trend,
    colorClass: "bg-gradient-to-br from-green-500 to-emerald-600",
  },
  {
    titleKey: "stats.totalProducts",
    value: data?.totalProducts || 0,
    icon: Package,
    colorClass: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  {
    titleKey: "stats.lowStock",
    value: data?.lowStockItems || 0,
    icon: AlertCircle,
    trend: data?.lowStockItems && data.lowStockItems > 0 ? {
      value: "ต้องเติมสต็อก",
      isPositive: false,
    } : undefined,
    colorClass: "bg-gradient-to-br from-orange-500 to-orange-600",
  },
  {
    titleKey: "stats.todayOrders",
    value: data?.salesCount || 0,
    icon: TrendingUp,
    colorClass: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
];

export const chartConfig = {
  colors: {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
};

interface DashboardData {
  todaySales: {
    total: number;
    count: number;
    trend: { value: string; isPositive: boolean };
  };
  totalProducts: number;
  lowStockItems: number;
  recentSales: Array<{
    id: string;
    sale_number: string;
    sale_date: string;
    total_amount: number;
    status: string;
  }>;
  topProducts: Array<{
    id: string;
    name_i18n: { th: string; en: string };
    code: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    total: number;
    count: number;
  }>;
}

export const useDashboard = () => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statsCards = getStatsCards({
    todaySales: dashboardData?.todaySales,
    totalProducts: dashboardData?.totalProducts,
    lowStockItems: dashboardData?.lowStockItems,
    salesCount: dashboardData?.todaySales?.count,
  });

  const quickActions = getQuickActions(locale);

  const handleQuickAction = (href: string) => {
    router.push(href);
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  return {
    t,
    status: {
      loading,
      refreshing,
    },
    stats: {
      statsCards,
      dashboardData,
    },
    actions: {
      quickActions,
      handleQuickAction,
      handleRefresh,
    },
  };
};
