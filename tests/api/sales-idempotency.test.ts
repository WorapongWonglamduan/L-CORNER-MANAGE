import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createSale } from "@/app/api/sales/route";
import { fakeSession, seedBasics, currentStock, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function saleRequest(body: unknown) {
  return new NextRequest("http://localhost/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// A double-submit (double-click past the UI's own guard, a network retry,
// two tabs) reusing the same client-generated idempotency_key must return
// the sale the first request created, not create a second real sale
// (double stock deduction, duplicate revenue).
describe("POST /api/sales - idempotency", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, shopId: fx.shopId, warehouseIds: [fx.warehouseId], permissions: ["sales.create"] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the original sale on a repeated request with the same idempotency_key", async () => {
    const body = {
      warehouse_id: fx.warehouseId,
      items: [{ product_id: fx.productId, quantity: 2 }],
      payment_method: "cash",
      idempotency_key: "test-key-1",
    };

    const first = await createSale(saleRequest(body));
    expect(first.status).toBe(201);
    const firstSale = await first.json();

    const second = await createSale(saleRequest(body));
    expect(second.status).toBe(200);
    const secondSale = await second.json();

    expect(secondSale.id).toBe(firstSale.id);
    expect(await prisma.sale.count()).toBe(1);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(98); // deducted once, not twice
  });

  it("creates separate sales for different idempotency_key values", async () => {
    const base = {
      warehouse_id: fx.warehouseId,
      items: [{ product_id: fx.productId, quantity: 1 }],
      payment_method: "cash",
    };

    const first = await createSale(saleRequest({ ...base, idempotency_key: "key-a" }));
    const second = await createSale(saleRequest({ ...base, idempotency_key: "key-b" }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await prisma.sale.count()).toBe(2);
  });

  it("still creates a sale normally when no idempotency_key is sent", async () => {
    const res = await createSale(
      saleRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 1 }],
        payment_method: "cash",
      }),
    );
    expect(res.status).toBe(201);
    expect(await prisma.sale.count()).toBe(1);
  });

  it("never lets two concurrent requests with the same idempotency_key create two sales", async () => {
    const body = {
      warehouse_id: fx.warehouseId,
      items: [{ product_id: fx.productId, quantity: 1 }],
      payment_method: "cash",
      idempotency_key: "concurrent-key",
    };

    const [r1, r2] = await Promise.all([
      createSale(saleRequest(body)),
      createSale(saleRequest(body)),
    ]);

    const statuses = [r1.status, r2.status].sort();
    // Exactly one creates (201), the other recognizes the replay (200) —
    // never both 201 (that would be two real sales).
    expect(statuses).toEqual([200, 201]);
    expect(await prisma.sale.count()).toBe(1);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(99); // deducted once
  });
});
