import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createTransfer } from "@/app/api/inventory/transfers/route";
import { GET as listMovements } from "@/app/api/inventory/movements/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// StockMovement has no defined relation for warehouse_id or reference_id
// (a loose reference_type/reference_id pair) — GET /api/inventory/movements
// resolves both in application code so the UI can show which single branch
// each movement happened at, and for a "transfer" movement specifically,
// both ends (from -> to), not just whichever leg that row represents.
describe("GET /api/inventory/movements - warehouse and transfer detail", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let otherWarehouseId: string;

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
    await prisma.userWarehouse.create({
      data: { user_id: fx.userId, warehouse_id: otherWarehouseId },
    });

    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId, otherWarehouseId],
        permissions: ["inventory.transfer", "inventory.view"],
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

  it("includes warehouse and from/to transfer detail on transfer movements", async () => {
    const transferRes = await createTransfer(
      new NextRequest("http://localhost/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_warehouse_id: fx.warehouseId,
          to_warehouse_id: otherWarehouseId,
          product_id: fx.productId,
          quantity: 5,
        }),
      }),
    );
    expect(transferRes.status).toBe(201);

    const res = await listMovements(
      new NextRequest(`http://localhost/api/inventory/movements?product_id=${fx.productId}&movement_type=transfer`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(2); // one "out" leg, one "in" leg

    for (const movement of body.items) {
      expect(movement.warehouse).not.toBeNull();
      expect(movement.transfer).not.toBeNull();
      expect(movement.transfer.from_warehouse.id).toBe(fx.warehouseId);
      expect(movement.transfer.to_warehouse.id).toBe(otherWarehouseId);
    }

    const outLeg = body.items.find((m: { direction: string }) => m.direction === "out");
    const inLeg = body.items.find((m: { direction: string }) => m.direction === "in");
    expect(outLeg.warehouse.id).toBe(fx.warehouseId);
    expect(inLeg.warehouse.id).toBe(otherWarehouseId);
  });

  it("leaves transfer as null for non-transfer movements", async () => {
    await prisma.stockMovement.create({
      data: {
        product_id: fx.productId,
        warehouse_id: fx.warehouseId,
        movement_type: "manual_adjustment",
        direction: "in",
        quantity_before: 50,
        quantity_change: 1,
        quantity_after: 51,
        reason_text: "test",
        created_by: fx.userId,
      },
    });

    const res = await listMovements(
      new NextRequest(`http://localhost/api/inventory/movements?product_id=${fx.productId}&movement_type=manual_adjustment`),
    );
    const body = await res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].warehouse.id).toBe(fx.warehouseId);
    expect(body.items[0].transfer).toBeNull();
  });
});
