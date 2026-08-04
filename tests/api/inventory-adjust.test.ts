import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as adjustStock } from "@/app/api/inventory/adjust/route";
import { fakeSession, seedBasics, currentStock, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function adjustRequest(body: unknown) {
  return new NextRequest("http://localhost/api/inventory/adjust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/inventory/adjust", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["inventory.view", "inventory.adjust"],
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

  // `!quantity` alone only rejects zero/falsy — a negative number is
  // truthy in JS, so each mode needs its own explicit positive-quantity
  // check or a negative value silently bypasses every stock-floor guard.
  it("rejects a negative quantity for adjustment_type 'in'", async () => {
    const res = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        adjustment_type: "in",
        quantity: -10,
        reason: "test",
      }),
    );
    expect(res.status).toBe(400);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100);
  });

  it("rejects a negative quantity for adjustment_type 'out'", async () => {
    const res = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        adjustment_type: "out",
        quantity: -10,
        reason: "test",
      }),
    );
    expect(res.status).toBe(400);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100);
  });

  it("rejects a negative absolute count for adjustment_type 'adjustment'", async () => {
    const res = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        adjustment_type: "adjustment",
        quantity: -5,
        reason: "test",
      }),
    );
    expect(res.status).toBe(400);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100);
  });

  it("still allows a legitimate positive 'in'/'out'/'adjustment'", async () => {
    const inRes = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        adjustment_type: "in",
        quantity: 10,
        reason: "restock",
      }),
    );
    expect(inRes.status).toBe(200);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(110);

    const outRes = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        adjustment_type: "out",
        quantity: 5,
        reason: "damaged",
      }),
    );
    expect(outRes.status).toBe(200);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(105);

    const setRes = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        adjustment_type: "adjustment",
        quantity: 50,
        reason: "recount",
      }),
    );
    expect(setRes.status).toBe(200);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(50);
  });

  // Per the allow-list product-visibility model, a product must be
  // explicitly assigned to a warehouse (create-time checkbox or the
  // "จัดการคลัง" modal) before it's sellable/visible there. Adjusting
  // stock for a product/warehouse pair with no existing ProductStock row
  // must not silently create one — that row defaults to is_active:true,
  // which would grant visibility as a side effect of recording a count.
  it("refuses to adjust stock for a product never assigned to the warehouse", async () => {
    const otherWarehouse = await prisma.warehouse.create({
      data: {
        shop_id: fx.shopId,
        code: `WHT2-${fx.userId.slice(0, 8)}`,
        name_i18n: { th: "คลัง 2", en: "Warehouse 2" },
      },
    });
    // The caller has live access to this warehouse (so the request reaches
    // the ProductStock existence check) — deliberately no ProductStock row
    // created for (fx.productId, otherWarehouse.id) itself.
    await prisma.userWarehouse.create({
      data: { user_id: fx.userId, warehouse_id: otherWarehouse.id },
    });

    const res = await adjustStock(
      adjustRequest({
        product_id: fx.productId,
        warehouse_id: otherWarehouse.id,
        adjustment_type: "in",
        quantity: 10,
        reason: "test",
      }),
    );
    expect(res.status).toBe(400);

    const stock = await prisma.productStock.findUnique({
      where: { product_id_warehouse_id: { product_id: fx.productId, warehouse_id: otherWarehouse.id } },
    });
    expect(stock).toBeNull();
  });
});
