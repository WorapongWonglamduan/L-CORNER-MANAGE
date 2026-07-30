import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as getDashboardStats } from "@/app/api/dashboard/stats/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// A refund never changes the original Sale row (no "refunded" SaleStatus,
// total_amount stays at the pre-refund figure) — the dashboard must net
// SaleRefund.total_amount back out of every revenue figure itself, or a
// refunded sale's full original amount keeps counting as revenue forever.
describe("GET /api/dashboard/stats - nets refunds out of revenue", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(50);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["reports.view"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("subtracts a same-day refund from today's revenue and the affected product's top-products revenue", async () => {
    const sale = await prisma.sale.create({
      data: {
        sale_number: `SAL-${fx.userId.slice(0, 8)}`,
        warehouse_id: fx.warehouseId,
        subtotal: 1000,
        total_amount: 1000,
        status: "completed",
      },
    });
    const saleItem = await prisma.saleItem.create({
      data: {
        sale_id: sale.id,
        product_id: fx.productId,
        quantity: 10,
        unit_price: 100,
        total_amount: 1000,
      },
    });
    const refund = await prisma.saleRefund.create({
      data: {
        sale_id: sale.id,
        refund_number: `REF-${fx.userId.slice(0, 8)}`,
        total_amount: 400,
      },
    });
    await prisma.saleRefundItem.create({
      data: {
        sale_refund_id: refund.id,
        sale_item_id: saleItem.id,
        quantity: 4,
        amount: 400,
      },
    });

    const res = await getDashboardStats(
      new NextRequest(`http://localhost/api/dashboard/stats?warehouseId=${fx.warehouseId}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.todaySales.total).toBe(600);

    const todayEntry = body.salesByDay[body.salesByDay.length - 1];
    expect(todayEntry.total).toBe(600);

    const topProduct = body.topProducts.find((p: { id: string }) => p.id === fx.productId);
    expect(topProduct).toBeDefined();
    expect(topProduct.totalRevenue).toBe(600);
    expect(topProduct.totalQuantity).toBe(6);
  });
});
