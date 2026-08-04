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
    const isSuperAdmin = session.user.is_super_admin;
    // Only meaningful for a super admin: pick one shop to drill into.
    // Omitting it means "aggregate across every shop in the system." A
    // regular user always sees their own shop only — this param is simply
    // ignored for them, never trusted to escape their own tenant.
    const shopIdParam = searchParams.get("shopId");
    const scopeShopId = isSuperAdmin ? shopIdParam || null : session.user.shop_id!;

    if (warehouseId && !isSuperAdmin) {
      const denied = requireWarehouseAccess(session, warehouseId);
      if (denied) return denied;
    }

    // A specific branch scopes every query to it; omitting it aggregates
    // across every branch this user is assigned to (not literally every
    // warehouse in the system) — except for a super admin, who has no
    // `warehouse_ids` of their own and instead aggregates across every
    // branch of the scoped shop(s).
    const warehouseIdFilter: Prisma.StringFilter | string | undefined = warehouseId
      ? warehouseId
      : isSuperAdmin
        ? undefined
        : { in: session.user.warehouse_ids };
    // Defense-in-depth on top of the warehouse_ids scoping above: nest the
    // filter through the warehouse relation so the resolved warehouse(s)
    // must also belong to the scoped shop — same idiom as /api/sales/route.ts.
    // Left empty entirely for a super admin viewing "every shop combined"
    // (no warehouseId, no shopId) — a genuine system-wide aggregate.
    const warehouseRelationFilter: Prisma.WarehouseWhereInput = {};
    if (warehouseIdFilter !== undefined) warehouseRelationFilter.id = warehouseIdFilter;
    if (scopeShopId) warehouseRelationFilter.shop_id = scopeShopId;
    const hasWarehouseScope = Object.keys(warehouseRelationFilter).length > 0;

    const saleWarehouseFilter: Prisma.SaleWhereInput = hasWarehouseScope
      ? { warehouse: warehouseRelationFilter }
      : {};
    const stockWarehouseFilter: Prisma.ProductStockWhereInput = hasWarehouseScope
      ? { warehouse: warehouseRelationFilter }
      : {};
    // A refund never changes the original Sale row (status stays
    // "completed", total_amount stays the pre-refund amount — there's no
    // "refunded" SaleStatus), so every revenue aggregate below must net out
    // SaleRefund.total_amount itself, dated by when the refund was actually
    // issued (created_at), not the original sale_date, since that's when
    // the money actually left the register.
    const refundWarehouseFilter: Prisma.SaleRefundWhereInput = {
      sale: saleWarehouseFilter,
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
    const todayRefunds = await prisma.saleRefund.aggregate({
      where: { created_at: { gte: today, lt: tomorrow }, ...refundWarehouseFilter },
      _sum: { total_amount: true },
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
    const yesterdayRefunds = await prisma.saleRefund.aggregate({
      where: { created_at: { gte: yesterday, lt: today }, ...refundWarehouseFilter },
      _sum: { total_amount: true },
    });

    // Calculate sales trend
    const todayTotal =
      Number(todaySales._sum.total_amount || 0) - Number(todayRefunds._sum.total_amount || 0);
    const yesterdayTotal =
      Number(yesterdaySales._sum.total_amount || 0) -
      Number(yesterdayRefunds._sum.total_amount || 0);
    const salesTrend = yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1)
      : "0";

    // Get total products (finished goods and semi-finished) — catalog-wide,
    // not warehouse-scoped (a product exists regardless of which branches
    // stock it).
    const totalProducts = await prisma.product.count({
      where: {
        ...(scopeShopId ? { shop_id: scopeShopId } : {}),
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
        ...(scopeShopId ? { shop_id: scopeShopId } : {}),
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

    // Nets refunds (issued within the same 30-day window) out of each of the
    // selected top-5 products' revenue/quantity — same "a refund never
    // touches the original Sale/SaleItem row" reasoning as todayRefunds
    // above, just joined through SaleRefundItem -> SaleItem to get back to
    // product_id.
    const topProductRefundItems = await prisma.saleRefundItem.findMany({
      where: {
        sale_item: { product_id: { in: topProducts.map((p) => p.product_id) } },
        sale_refund: {
          created_at: { gte: thirtyDaysAgo },
          ...refundWarehouseFilter,
        },
      },
      select: { amount: true, quantity: true, sale_item: { select: { product_id: true } } },
    });
    const refundedByProduct = new Map<string, { amount: number; quantity: number }>();
    for (const refundItem of topProductRefundItems) {
      const productId = refundItem.sale_item.product_id;
      const entry = refundedByProduct.get(productId) ?? { amount: 0, quantity: 0 };
      entry.amount += Number(refundItem.amount);
      entry.quantity += Number(refundItem.quantity);
      refundedByProduct.set(productId, entry);
    }

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
        const refunded = refundedByProduct.get(item.product_id);
        return {
          id: product?.id,
          name_i18n: product?.name_i18n,
          code: product?.code,
          current_stock,
          totalQuantity: Number(item._sum.quantity || 0) - (refunded?.quantity || 0),
          totalRevenue: Number(item._sum.total_amount || 0) - (refunded?.amount || 0),
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
        const dayRefunds = await prisma.saleRefund.aggregate({
          where: { created_at: { gte: date, lt: nextDate }, ...refundWarehouseFilter },
          _sum: { total_amount: true },
        });

        return {
          // format() reads the Date's local getters — toISOString() would
          // convert to UTC first, shifting the label a day off from the
          // query's own (local-midnight) day boundaries above.
          date: format(date, "yyyy-MM-dd"),
          total:
            Number(daySales._sum.total_amount || 0) -
            Number(dayRefunds._sum.total_amount || 0),
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
