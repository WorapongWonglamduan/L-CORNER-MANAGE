import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as getProduct } from "@/app/api/products/[id]/route";
import { POST as createSale } from "@/app/api/sales/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// GET /api/products/[id] previously had no can_delete field at all — the
// product detail page's "Delete" button always attempted a hard delete
// with no way to tell it was going to fail (or, worse, no way to know it
// would actually succeed and destroy a product with real history), unlike
// the list page which already hides that button when can_delete is false.
describe("GET /api/products/[id] - can_delete", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(10);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        shopId: fx.shopId,
        warehouseIds: [fx.warehouseId],
        permissions: ["products.view", "sales.create"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("is true for a product with no sale history/recipe/topping/transfer usage", async () => {
    const res = await getProduct(
      new NextRequest(`http://localhost/api/products/${fx.productId}`),
      { params: Promise.resolve({ id: fx.productId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.can_delete).toBe(true);
  });

  it("is false once the product has been sold", async () => {
    const saleRes = await createSale(
      new NextRequest("http://localhost/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_id: fx.warehouseId,
          items: [{ product_id: fx.productId, quantity: 1 }],
          payment_method: "cash",
        }),
      }),
    );
    expect(saleRes.status).toBe(201);

    const res = await getProduct(
      new NextRequest(`http://localhost/api/products/${fx.productId}`),
      { params: Promise.resolve({ id: fx.productId }) },
    );
    const body = await res.json();
    expect(body.can_delete).toBe(false);
  });
});
