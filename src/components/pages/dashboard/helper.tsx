import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
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

export interface WarehouseOption {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
}

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
  const { data: session } = useSession();
  const sessionWarehouseIds = session?.user?.warehouse_ids;
  const assignedWarehouseIds = useMemo(
    () => sessionWarehouseIds ?? [],
    [sessionWarehouseIds],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  // "all" = every branch this user is assigned to, combined. Deliberately
  // not "" — the shared Input select control always injects its own blank
  // placeholder option with value="", which would collide with an "all
  // branches" option using the same value.
  const { control, watch, setValue, formState: { errors } } = useForm<{
    warehouseId: string;
  }>({
    defaultValues: { warehouseId: "all" },
  });
  const warehouseId = watch("warehouseId");
  const setWarehouseId = useCallback(
    (value: string) => setValue("warehouseId", value),
    [setValue],
  );

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch("/api/warehouses?pageSize=100&isActive=true");
        const data = await response.json();
        const allItems: WarehouseOption[] = data.items || [];
        setWarehouses(
          allItems.filter((w) => assignedWarehouseIds.includes(w.id)),
        );
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      }
    };
    fetchWarehouses();
  }, [assignedWarehouseIds]);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const query = warehouseId !== "all" ? `?warehouseId=${warehouseId}` : "";
      const response = await fetch(`/api/dashboard/stats${query}`);
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
  }, [warehouseId]);

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

  // The stats query already scopes to the selected branch server-side; the
  // map has no server round-trip, so it needs the same "all" vs one-branch
  // filter applied client-side to match.
  const visibleWarehouses = useMemo(
    () =>
      warehouseId === "all"
        ? warehouses
        : warehouses.filter((w) => w.id === warehouseId),
    [warehouses, warehouseId],
  );

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
    filterForm: {
      control,
      errors,
    },
    warehouse: {
      warehouses,
      visibleWarehouses,
      warehouseId,
      setWarehouseId,
    },
  };
};
