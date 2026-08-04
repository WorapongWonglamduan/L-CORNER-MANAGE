import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as listSales } from "@/app/api/sales/route";
import { GET as getSale, PUT as putSale, DELETE as voidSale } from "@/app/api/sales/[id]/route";
import { GET as listMovements } from "@/app/api/inventory/movements/route";
import { GET as listTransfers } from "@/app/api/inventory/transfers/route";
import { GET as listWarehouses } from "@/app/api/warehouses/route";
import { GET as getWarehouse } from "@/app/api/warehouses/[id]/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// Regression coverage for a set of broken-access-control (IDOR) findings:
// a user assigned to only one branch must never see or mutate another
// branch's sales/movements/transfers, whether via an unfiltered list
// (omitting warehouseId) or by calling a detail/mutation endpoint directly
// with a known id from another branch.
describe("Warehouse scoping across branches", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let otherWarehouseId: string;
  let ownSaleId: string;
  let otherSaleId: string;

  beforeEach(async () => {
    fx = await seedBasics(50);
    const other = await prisma.warehouse.create({
      data: {
        shop_id: fx.shopId,
        code: `WHT2-${fx.userId.slice(0, 8)}`,
        name_i18n: { th: "คลัง 2", en: "Warehouse 2" },
      },
    });
    otherWarehouseId = other.id;
    // The test user is deliberately NOT assigned to otherWarehouseId.

    const ownSale = await prisma.sale.create({
      data: {
        sale_number: `SAL-OWN-${fx.userId.slice(0, 8)}`,
        warehouse_id: fx.warehouseId,
        subtotal: 100,
        total_amount: 100,
      },
    });
    ownSaleId = ownSale.id;

    const otherSale = await prisma.sale.create({
      data: {
        sale_number: `SAL-OTHER-${fx.userId.slice(0, 8)}`,
        warehouse_id: otherWarehouseId,
        subtotal: 200,
        total_amount: 200,
      },
    });
    otherSaleId = otherSale.id;

    await prisma.stockMovement.create({
      data: {
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        movement_type: "adjustment",
        direction: "in",
        quantity_before: 0,
        quantity_change: 1,
        quantity_after: 1,
        reason_text: "own branch movement",
        created_by: fx.userId,
      },
    });
    await prisma.stockMovement.create({
      data: {
        product_id: fx.productId,
        warehouse_id: otherWarehouseId,
        movement_type: "adjustment",
        direction: "in",
        quantity_before: 0,
        quantity_change: 1,
        quantity_after: 1,
        reason_text: "other branch movement",
        created_by: fx.userId,
      },
    });

    await prisma.stockTransfer.create({
      data: {
        from_warehouse_id: otherWarehouseId,
        to_warehouse_id: otherWarehouseId,
        product_id: fx.productId,
        quantity: 1,
        note: "other branch transfer",
      },
    });

    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["sales.view", "sales.void", "inventory.view"],
        shopId: fx.shopId,
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/sales without warehouseId only returns the caller's own branch", async () => {
    const res = await listSales(new NextRequest("http://localhost/api/sales"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.items ? body.items.map((s: { id: string }) => s.id) : body.sales?.map((s: { id: string }) => s.id);
    const saleIds: string[] = ids ?? body.data?.map((s: { id: string }) => s.id) ?? [];
    expect(saleIds).toContain(ownSaleId);
    expect(saleIds).not.toContain(otherSaleId);
  });

  it("GET /api/sales/[id] denies access to a sale in another branch", async () => {
    const ownRes = await getSale(
      new NextRequest(`http://localhost/api/sales/${ownSaleId}`),
      { params: Promise.resolve({ id: ownSaleId }) },
    );
    expect(ownRes.status).toBe(200);

    const otherRes = await getSale(
      new NextRequest(`http://localhost/api/sales/${otherSaleId}`),
      { params: Promise.resolve({ id: otherSaleId }) },
    );
    expect(otherRes.status).toBe(403);
  });

  it("PUT /api/sales/[id] denies editing a sale in another branch", async () => {
    const res = await putSale(
      new NextRequest(`http://localhost/api/sales/${otherSaleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "unpaid" }),
      }),
      { params: Promise.resolve({ id: otherSaleId }) },
    );
    expect(res.status).toBe(403);

    const stillSale = await prisma.sale.findUnique({ where: { id: otherSaleId } });
    expect(stillSale?.payment_status).toBe("paid");
  });

  it("DELETE /api/sales/[id] denies voiding a sale in another branch", async () => {
    const res = await voidSale(
      new NextRequest(`http://localhost/api/sales/${otherSaleId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: otherSaleId }) },
    );
    expect(res.status).toBe(403);

    const stillSale = await prisma.sale.findUnique({ where: { id: otherSaleId } });
    expect(stillSale?.status).toBe("completed");
  });

  it("GET /api/inventory/movements without warehouseId only returns the caller's own branch", async () => {
    const res = await listMovements(new NextRequest("http://localhost/api/inventory/movements"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const warehouseIds = body.items.map((m: { warehouse_id: string }) => m.warehouse_id);
    expect(warehouseIds.every((id: string) => id === fx.warehouseId)).toBe(true);
    expect(warehouseIds).not.toContain(otherWarehouseId);
  });

  it("GET /api/inventory/transfers without warehouseId only returns the caller's own branch", async () => {
    const res = await listTransfers(new NextRequest("http://localhost/api/inventory/transfers"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.items.map((t: { from_warehouse_id: string; to_warehouse_id: string }) => [
      t.from_warehouse_id,
      t.to_warehouse_id,
    ]);
    expect(ids.flat()).not.toContain(otherWarehouseId);
  });

  // GET /api/warehouses previously returned every warehouse (address, GPS
  // coordinates, promptpay_id included) to any authenticated user regardless
  // of role or branch assignment — a cashier or manager without
  // settings.view could see every other branch's data. Only settings.view
  // (admin-level) callers should see the unrestricted list.
  it("GET /api/warehouses only returns the caller's assigned branch for a non-admin", async () => {
    const res = await listWarehouses(new NextRequest("http://localhost/api/warehouses?pageSize=100"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.items.map((w: { id: string }) => w.id);
    expect(ids).toContain(fx.warehouseId);
    expect(ids).not.toContain(otherWarehouseId);
  });

  it("GET /api/warehouses returns every branch for a settings.view (admin) caller", async () => {
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["settings.view"],
        shopId: fx.shopId,
      }),
    );
    const res = await listWarehouses(new NextRequest("http://localhost/api/warehouses?pageSize=100"));
    const body = await res.json();
    const ids = body.items.map((w: { id: string }) => w.id);
    expect(ids).toContain(fx.warehouseId);
    expect(ids).toContain(otherWarehouseId);
  });

  it("GET /api/warehouses/[id] denies a non-admin looking up another branch by id", async () => {
    const ownRes = await getWarehouse(
      new NextRequest(`http://localhost/api/warehouses/${fx.warehouseId}`),
      { params: Promise.resolve({ id: fx.warehouseId }) },
    );
    expect(ownRes.status).toBe(200);

    const otherRes = await getWarehouse(
      new NextRequest(`http://localhost/api/warehouses/${otherWarehouseId}`),
      { params: Promise.resolve({ id: otherWarehouseId }) },
    );
    expect(otherRes.status).toBe(403);
  });
});
