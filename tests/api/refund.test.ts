import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createSale } from "@/app/api/sales/route";
import { POST as refundSale } from "@/app/api/sales/[id]/refund/route";
import { DELETE as voidSale } from "@/app/api/sales/[id]/route";
import { fakeSession, seedBasics, currentStock, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function refundRequest(saleId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/sales/${saleId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/sales/[id]/refund", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let saleId: string;
  let saleItemId: string;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["sales.create", "sales.refund", "sales.view", "sales.void"],
      }),
    );

    const createRes = await createSale(
      new NextRequest("http://localhost/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_id: fx.warehouseId,
          items: [{ product_id: fx.productId, quantity: 5 }],
          payment_method: "cash",
        }),
      }),
    );
    const sale = await createRes.json();
    saleId = sale.id;
    saleItemId = sale.items[0].id;
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("restores stock proportionally for a partial refund, leaving the sale intact", async () => {
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(95); // 100 - 5 sold

    const res = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 2 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );

    expect(res.status).toBe(201);
    const refund = await res.json();
    expect(Number(refund.total_amount)).toBe(40); // 2 units * ฿20
    expect(refund.refund_number).toMatch(/^REF-\d{8}-\d{4}$/);

    // Only the refunded 2 units come back — the other 3 stay sold.
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(97);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    expect(sale?.status).toBe("completed");
  });

  it("rejects refunding more than what remains after an earlier partial refund", async () => {
    const first = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 3 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(first.status).toBe(201);

    // Only 2 of the original 5 remain refundable now.
    const second = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 3 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(second.status).toBe(400);

    // The rejected second attempt must not have touched stock further.
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(98); // 95 + 3 restored
  });

  it("rejects a negative/zero refund quantity", async () => {
    const res = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: -1 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(400);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(95);
  });

  it("rejects refunding a sale_item_id that doesn't belong to the sale", async () => {
    const res = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: "not-a-real-id", quantity: 1 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects refunding a cancelled sale", async () => {
    await prisma.sale.update({ where: { id: saleId }, data: { status: "cancelled" } });

    const res = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 1 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(400);
  });

  it("allows fully refunding across two separate partial refunds", async () => {
    const r1 = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 2 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(r1.status).toBe(201);

    const r2 = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 3 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(r2.status).toBe(201);

    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100); // fully restored

    // A third refund attempt now has nothing left to refund.
    const r3 = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 1 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(r3.status).toBe(400);
  });

  it("blocks voiding a sale that already has a refund (would double-restore stock)", async () => {
    const refundRes = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 2 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(refundRes.status).toBe(201);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(97); // 95 + 2 refunded

    const voidRes = await voidSale(
      new NextRequest(`http://localhost/api/sales/${saleId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(voidRes.status).toBe(400);

    // Rejected before touching anything — stock must be exactly where the
    // refund left it, not restored a second time for the full 5 units.
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(97);
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    expect(sale?.status).toBe("completed");
  });

  it("never lets two concurrent refunds over-refund the same item (Serializable + retry)", async () => {
    // The sale item has quantity 5. Two concurrent requests each ask for 3
    // — fine individually, but 3+3=6 exceeds what was ever sold. Without
    // the Serializable-isolation fix, both could read "5 remaining" before
    // either commits and both would succeed, over-refunding by 1.
    const [r1, r2] = await Promise.all([
      refundSale(
        refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 3 }] }),
        { params: Promise.resolve({ id: saleId }) },
      ),
      refundSale(
        refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 3 }] }),
        { params: Promise.resolve({ id: saleId }) },
      ),
    ]);

    const statuses = [r1.status, r2.status].sort();
    // Exactly one must succeed and one must be rejected as exceeding what's
    // refundable — never both succeeding, never both failing.
    expect(statuses).toEqual([201, 400]);

    const refunds = await prisma.saleRefund.findMany({
      where: { sale_id: saleId },
      include: { items: true },
    });
    const totalRefunded = refunds
      .flatMap((r) => r.items)
      .filter((i) => i.sale_item_id === saleItemId)
      .reduce((sum, i) => sum + Number(i.quantity), 0);
    expect(totalRefunded).toBe(3);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(98); // 95 + 3
  });

  it("never lets two concurrent voids double-restore the same sale's stock", async () => {
    // Same class of bug as the refund race above, but in DELETE (void):
    // without Serializable + retry, both requests could read "completed"
    // before either commits, and both would restore the full 5 units.
    const voidReq = () =>
      voidSale(
        new NextRequest(`http://localhost/api/sales/${saleId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: saleId }) },
      );

    const [r1, r2] = await Promise.all([voidReq(), voidReq()]);

    const statuses = [r1.status, r2.status].sort();
    // Exactly one void succeeds; the other must see "already cancelled".
    expect(statuses).toEqual([200, 400]);

    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100); // 95 + 5, not +10
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    expect(sale?.status).toBe("cancelled");
  });
});
