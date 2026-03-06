import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get total products (finished goods and semi-finished)
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

    // Get low stock items
    const lowStockItems = await prisma.product.count({
      where: {
        is_active: true,
        deleted_at: null,
        track_stock: true,
        OR: [
          {
            current_stock: {
              lte: prisma.product.fields.low_stock_threshold,
            },
          },
        ],
      },
    });

    // Get recent sales (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSales = await prisma.sale.findMany({
      where: {
        sale_date: {
          gte: sevenDaysAgo,
        },
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
            current_stock: true,
          },
        });
        return {
          ...product,
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
          },
          _sum: {
            total_amount: true,
          },
          _count: true,
        });

        return {
          date: date.toISOString().split("T")[0],
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
