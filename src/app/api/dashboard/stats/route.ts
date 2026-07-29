import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireWarehouseAccess } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");

    if (warehouseId) {
      const denied = requireWarehouseAccess(session, warehouseId);
      if (denied) return denied;
    }

    // A specific branch scopes every query to it; omitting it aggregates
    // across every branch this user is assigned to (not literally every
    // warehouse in the system). Same filter shape, typed per-model since
    // Prisma's WhereInput types are nominally distinct despite being
    // structurally identical here.
    const warehouseIdFilter: Prisma.StringFilter | string = warehouseId
      ? warehouseId
      : { in: session.user.warehouse_ids };
    const saleWarehouseFilter: Prisma.SaleWhereInput = {
      warehouse_id: warehouseIdFilter,
    };
    const stockWarehouseFilter: Prisma.ProductStockWhereInput = {
      warehouse_id: warehouseIdFilter,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's sales
    const todaySales = await prisma.sale.aggregate({
      where: {
        sale_date: {
          gte: today,
          lt: tomorrow,
        },
        status: "completed",
        ...saleWarehouseFilter,
      },
      _sum: {
        total_amount: true,
      },
      _count: true,
    });

    // Get yesterday's sales for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySales = await prisma.sale.aggregate({
      where: {
        sale_date: {
          gte: yesterday,
          lt: today,
        },
        status: "completed",
        ...saleWarehouseFilter,
      },
      _sum: {
        total_amount: true,
      },
    });

    // Calculate sales trend
    const todayTotal = Number(todaySales._sum.total_amount || 0);
    const yesterdayTotal = Number(yesterdaySales._sum.total_amount || 0);
    const salesTrend = yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1)
      : "0";

    // Get total products (finished goods and semi-finished) — catalog-wide,
    // not warehouse-scoped (a product exists regardless of which branches
    // stock it).
    const totalProducts = await prisma.product.count({
      where: {
        is_active: true,
        deleted_at: null,
        product_type: {
          type: {
            in: ["finished_good", "semi_finished"],
          },
        },
      },
    });

    // Get low stock items — a product counts as low stock if any warehouse
    // (within the current branch scope) it's stocked at is at or below that
    // warehouse's low_stock_threshold.
    const trackedProductsStock = await prisma.product.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        track_stock: true,
      },
      select: { stock: { where: stockWarehouseFilter } },
    });
    const lowStockItems = trackedProductsStock.filter((p) =>
      p.stock.some((s) => Number(s.current_stock) <= Number(s.low_stock_threshold)),
    ).length;

    // Get recent sales (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSales = await prisma.sale.findMany({
      where: {
        sale_date: {
          gte: sevenDaysAgo,
        },
        ...saleWarehouseFilter,
      },
      select: {
        id: true,
        sale_number: true,
        sale_date: true,
        total_amount: true,
        status: true,
        payment_status: true,
      },
      orderBy: {
        sale_date: "desc",
      },
      take: 5,
    });

    // Get top selling products (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topProducts = await prisma.saleItem.groupBy({
      by: ["product_id"],
      where: {
        sale: {
          sale_date: {
            gte: thirtyDaysAgo,
          },
          status: "completed",
          ...saleWarehouseFilter,
        },
      },
      _sum: {
        quantity: true,
        total_amount: true,
      },
      orderBy: {
        _sum: {
          total_amount: "desc",
        },
      },
      take: 5,
    });

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.product_id },
          select: {
            id: true,
            name_i18n: true,
            code: true,
            stock: { where: stockWarehouseFilter },
          },
        });
        const current_stock =
          product?.stock.reduce((sum, s) => sum + Number(s.current_stock), 0) ?? 0;
        return {
          id: product?.id,
          name_i18n: product?.name_i18n,
          code: product?.code,
          current_stock,
          totalQuantity: Number(item._sum.quantity || 0),
          totalRevenue: Number(item._sum.total_amount || 0),
        };
      })
    );

    // Get sales by day for chart (last 7 days)
    const salesByDay = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const daySales = await prisma.sale.aggregate({
          where: {
            sale_date: {
              gte: date,
              lt: nextDate,
            },
            status: "completed",
            ...saleWarehouseFilter,
          },
          _sum: {
            total_amount: true,
          },
          _count: true,
        });

        return {
          // format() reads the Date's local getters — toISOString() would
          // convert to UTC first, shifting the label a day off from the
          // query's own (local-midnight) day boundaries above.
          date: format(date, "yyyy-MM-dd"),
          total: Number(daySales._sum.total_amount || 0),
          count: daySales._count,
        };
      })
    );

    return NextResponse.json({
      todaySales: {
        total: todayTotal,
        count: todaySales._count,
        trend: {
          value: `${Number(salesTrend) >= 0 ? "+" : ""}${salesTrend}%`,
          isPositive: Number(salesTrend) >= 0,
        },
      },
      totalProducts,
      lowStockItems,
      recentSales,
      topProducts: topProductsWithDetails,
      salesByDay,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch dashboard stats";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
