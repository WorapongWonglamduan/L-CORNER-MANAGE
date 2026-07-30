import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as listProducts } from "@/app/api/products/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// The POS cart re-fetches exactly the products it's holding (by id) right
// before checkout to catch a price/stock change that happened while those
// lines just sat in the cart — this only works if `ids` bypasses the normal
// page/search/category filters and returns every requested product in one
// call, unpaginated.
describe("GET /api/products - ids filter", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns only the requested products, with their current price and stock", async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, warehouseIds: [fx.warehouseId], permissions: ["products.view"] }),
    );

    const otherProduct = await prisma.product.create({
      data: {
        code: `PT2-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "สินค้าอื่น", en: "Other Product" },
        product_type_id: fx.productTypeId,
        base_unit_id: fx.unitId,
        selling_price: 30,
        track_stock: true,
      },
    });
    await prisma.productStock.create({
      data: { product_id: otherProduct.id, warehouse_id: fx.warehouseId, current_stock: 5 },
    });

    // Price changed after the item would have been added to a cart.
    await prisma.product.update({
      where: { id: fx.productId },
      data: { selling_price: 25 },
    });

    const res = await listProducts(
      new NextRequest(
        `http://localhost/api/products?ids=${fx.productId}&pageSize=1&warehouseId=${fx.warehouseId}`,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(fx.productId);
    expect(Number(body.items[0].selling_price)).toBe(25);
    expect(body.items[0].available_quantity).toBe(100);
  });

  it("omits a product that no longer has active stock at the requested warehouse", async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, warehouseIds: [fx.warehouseId], permissions: ["products.view"] }),
    );

    await prisma.productStock.update({
      where: {
        product_id_warehouse_id: { product_id: fx.productId, warehouse_id: fx.warehouseId },
      },
      data: { is_active: false },
    });

    const res = await listProducts(
      new NextRequest(
        `http://localhost/api/products?ids=${fx.productId}&pageSize=1&warehouseId=${fx.warehouseId}`,
      ),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });
});
