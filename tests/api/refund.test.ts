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
        shopId: fx.shopId,
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

  it("rejects duplicate sale_item_id entries within one request that together exceed what's refundable", async () => {
    // The sale item has quantity 5. Two entries for the SAME sale_item_id
    // in one request, each individually well within 5, but summing to 6 —
    // must be collapsed and checked together, not validated independently
    // against the same stale "5 remaining" snapshot.
    const res = await refundSale(
      refundRequest(saleId, {
        items: [
          { sale_item_id: saleItemId, quantity: 3 },
          { sale_item_id: saleItemId, quantity: 3 },
        ],
      }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(400);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(95); // untouched
  });

  it("allows duplicate sale_item_id entries that together stay within what's refundable", async () => {
    const res = await refundSale(
      refundRequest(saleId, {
        items: [
          { sale_item_id: saleItemId, quantity: 2 },
          { sale_item_id: saleItemId, quantity: 2 },
        ],
      }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(201);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(99); // 95 + 4
  });

  it("rejects refunding a sale that a concurrent void already cancelled", async () => {
    const voidRes = await voidSale(
      new NextRequest(`http://localhost/api/sales/${saleId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(voidRes.status).toBe(200);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100); // void restored all 5

    const refundRes = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 1 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(refundRes.status).toBe(400);

    // Must not have double-restored on top of what the void already did.
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100);
  });

  it("never lets a void and a refund race into a double stock restore", async () => {
    // Same class of race as the concurrent-refund/concurrent-void tests
    // above, but across the two different endpoints: without re-checking
    // status inside the refund's own transaction, a refund racing a void
    // could read "completed" before the void commits and still restore
    // stock on top of what the void restores.
    const [voidRes, refundRes] = await Promise.all([
      voidSale(new NextRequest(`http://localhost/api/sales/${saleId}`, { method: "DELETE" }), {
        params: Promise.resolve({ id: saleId }),
      }),
      refundSale(
        refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 2 }] }),
        { params: Promise.resolve({ id: saleId }) },
      ),
    ]);

    const statuses = [voidRes.status, refundRes.status].sort((a, b) => a - b);
    // Exactly one wins — either the void cancels it first (200) and the
    // refund then sees "not completed" (400), or the refund commits first
    // (201) and the void then sees "already has refunds" (400). Both
    // orderings are legitimate outcomes of the same race — which one
    // actually wins varies with scheduling/timing (confirmed flaky in CI,
    // where the refund won consistently unlike local runs) — never both
    // succeeding is the only invariant this test can assert.
    expect([[200, 400], [201, 400]]).toContainEqual(statuses);

    // Whichever won, stock must reflect exactly ONE restoration of the 5
    // sold units — never 5 (void) + 2 (refund) = 7, and never double-counted.
    const stock = await currentStock(fx.productId, fx.warehouseId);
    expect(stock === 100 || stock === 97).toBe(true);
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

// A void releases the promotion redemption it used, so a cancelled sale
// doesn't permanently consume a max_uses:1 code's only use — a refund that
// returns every item's full quantity is the same "customer got everything
// back" outcome and must release it too, or the code becomes permanently
// unusable the moment a fully-refunded sale is processed as a refund
// instead of a void.
describe("POST /api/sales/[id]/refund - promotion usage release", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let saleId: string;
  let saleItemId: string;
  let promotionId: string;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        shopId: fx.shopId,
        warehouseIds: [fx.warehouseId],
        permissions: ["sales.create", "sales.refund", "sales.view"],
      }),
    );

    const promotion = await prisma.promotion.create({
      data: {
        shop_id: fx.shopId,
        // Uppercase — POST /api/sales normalizes the incoming code to
        // uppercase before looking it up, so a lowercase-hex UUID slice
        // here would never match.
        code: `PROMO-${fx.userId.slice(0, 8).toUpperCase()}`,
        name_i18n: { th: "โปรโมชั่นทดสอบ", en: "Test Promo" },
        discount_type: "fixed",
        discount_value: 10,
        max_uses: 1,
      },
    });
    promotionId = promotion.id;

    // Sale creation itself claims the promotion's only use (used_count 0 -> 1).
    const createRes = await createSale(
      new NextRequest("http://localhost/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_id: fx.warehouseId,
          items: [{ product_id: fx.productId, quantity: 5 }],
          payment_method: "cash",
          promotion_code: promotion.code,
        }),
      }),
    );
    const sale = await createRes.json();
    saleId = sale.id;
    saleItemId = sale.items[0].id;
    expect((await prisma.promotion.findUnique({ where: { id: promotionId } }))?.used_count).toBe(1);
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("releases the promotion's used_count once every item is fully refunded", async () => {
    const res = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 5 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(201);

    const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    expect(promotion?.used_count).toBe(0);
  });

  it("does NOT release the promotion's used_count for a partial refund", async () => {
    const res = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 2 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(res.status).toBe(201);

    const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    expect(promotion?.used_count).toBe(1);
  });

  it("releases used_count when full refund happens across two partial refunds", async () => {
    const r1 = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 2 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(r1.status).toBe(201);
    expect((await prisma.promotion.findUnique({ where: { id: promotionId } }))?.used_count).toBe(1);

    const r2 = await refundSale(
      refundRequest(saleId, { items: [{ sale_item_id: saleItemId, quantity: 3 }] }),
      { params: Promise.resolve({ id: saleId }) },
    );
    expect(r2.status).toBe(201);
    expect((await prisma.promotion.findUnique({ where: { id: promotionId } }))?.used_count).toBe(0);
  });
});
