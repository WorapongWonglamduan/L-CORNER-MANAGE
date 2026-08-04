import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST, GET } from "@/app/api/sales/route";
import { DELETE } from "@/app/api/sales/[id]/route";
import { fakeSession, seedBasics, currentStock, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

// next-auth's real `auth` export is overloaded (plain session getter, or a
// route-handler-wrapping middleware) — vi.mocked() can't disambiguate that
// against the mock factory above, so it's narrowed here to the one shape
// actually used in these tests.
const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// getLocale()/getTranslations() rely on next-intl's request-scoped context,
// which only exists when Next.js itself is serving the request — calling
// the route handler directly (bypassing the framework) has none of that.
// Stubbed to the simplest thing that satisfies the route's usage: a fixed
// locale, and a "translator" that just echoes back the key.
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

function postSalesRequest(body: unknown) {
  return new NextRequest("http://localhost/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/sales", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, shopId: fx.shopId, warehouseIds: [fx.warehouseId] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("rejects a negative quantity instead of adding stock back", async () => {
    const before = await currentStock(fx.productId, fx.warehouseId);

    const res = await POST(
      postSalesRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: -5 }],
        payment_method: "cash",
      }),
    );

    expect(res.status).toBe(400);
    // The whole point of the regression test: a negative quantity must
    // never reach the stock-deduction step at all.
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(before);
  });

  it("treats a zero quantity as the existing `|| 1` default, not an error", async () => {
    // Documents actual behavior rather than asserting a stricter rule the
    // rest of the codebase doesn't follow: `item.quantity || 1` (same
    // pattern used for topping quantities) already treats every falsy
    // value — 0, null, undefined — as "not specified, default to 1", so 0
    // never reaches the new `quantity > 0` guard as literally 0. That
    // guard exists to catch *negative* values slipping through unchanged,
    // which is the actual exploit (see the test above) — 0 was never a
    // distinct case.
    const res = await POST(
      postSalesRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 0 }],
        payment_method: "cash",
      }),
    );
    expect(res.status).toBe(201);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(99);
  });

  it("deducts stock and records a completed sale on success", async () => {
    const res = await POST(
      postSalesRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 3 }],
        payment_method: "cash",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(Number(body.total_amount)).toBe(60); // 3 * 20 selling_price

    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(97);
  });

  it("rejects the whole sale when stock is insufficient", async () => {
    const res = await POST(
      postSalesRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 1000 }],
        payment_method: "cash",
      }),
    );

    expect(res.status).toBe(500);
    // Stock must be untouched — this is the "reject before deducting
    // anything" guarantee, not a partial deduction.
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100);
  });
});

describe("GET /api/sales date range filter (Asia/Bangkok local-day boundaries)", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, shopId: fx.shopId, warehouseIds: [fx.warehouseId] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("finds a sale filed at both the very start and very end of the local day", async () => {
    // Regression test for the UTC-midnight-boundary bug: before the fix,
    // filtering a single local day returned nothing (gte/lte collapsed to
    // the same UTC instant). These two sale_dates are chosen right at the
    // edges of 2026-07-27 in Asia/Bangkok (UTC+7) — 00:00:01 and 23:59:59
    // local time — specifically to catch an off-by-timezone regression.
    const sale1 = await prisma.sale.create({
      data: {
        sale_number: "SAL-TEST-0001",
        sale_date: new Date("2026-07-27T00:00:01+07:00"),
        warehouse_id: fx.warehouseId,
        subtotal: 20,
        total_amount: 20,
        status: "completed",
      },
    });
    const sale2 = await prisma.sale.create({
      data: {
        sale_number: "SAL-TEST-0002",
        sale_date: new Date("2026-07-27T23:59:59+07:00"),
        warehouse_id: fx.warehouseId,
        subtotal: 20,
        total_amount: 20,
        status: "completed",
      },
    });
    // Just outside the day on both sides — must NOT show up.
    await prisma.sale.create({
      data: {
        sale_number: "SAL-TEST-0003",
        sale_date: new Date("2026-07-26T23:59:59+07:00"),
        warehouse_id: fx.warehouseId,
        subtotal: 20,
        total_amount: 20,
        status: "completed",
      },
    });
    await prisma.sale.create({
      data: {
        sale_number: "SAL-TEST-0004",
        sale_date: new Date("2026-07-28T00:00:01+07:00"),
        warehouse_id: fx.warehouseId,
        subtotal: 20,
        total_amount: 20,
        status: "completed",
      },
    });

    const res = await GET(
      new NextRequest(
        "http://localhost/api/sales?startDate=2026-07-27&endDate=2026-07-27&pageSize=50",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const numbers = body.items.map((s: { sale_number: string }) => s.sale_number).sort();

    expect(numbers).toEqual([sale1.sale_number, sale2.sale_number].sort());
  });
});

describe("DELETE /api/sales/[id] (void)", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, shopId: fx.shopId, warehouseIds: [fx.warehouseId] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("restores the deducted stock and marks the sale cancelled", async () => {
    const createRes = await POST(
      postSalesRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 4 }],
        payment_method: "cash",
      }),
    );
    const sale = await createRes.json();
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(96);

    const voidRes = await DELETE(
      new NextRequest(`http://localhost/api/sales/${sale.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: sale.id }) },
    );

    expect(voidRes.status).toBe(200);
    const voided = await voidRes.json();
    expect(voided.status).toBe("cancelled");
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(100);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
