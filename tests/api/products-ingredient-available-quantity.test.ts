import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as listProducts } from "@/app/api/products/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// The existing products-stock-status.test.ts covers SEMI_FINISHED (the
// special recipe-based case) but its "ingredient" fixture actually reuses
// seedBasics' finished_good product type — FINISHED_GOOD's available_quantity
// was never broken, only INGREDIENT/CONTAINER were (available_quantity
// silently defaulted to 0 instead of current_stock). This test uses the
// real "ingredient" product_type.type to actually exercise that fix.
describe("GET /api/products - available_quantity for genuine ingredient/container types", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(1);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, warehouseIds: [fx.warehouseId], permissions: ["products.view"] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reports available_quantity equal to current_stock for an 'ingredient' type product", async () => {
    const ingredientType = await prisma.productType.create({
      data: {
        code: `INGT-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "วัตถุดิบ", en: "Ingredient" },
        type: "ingredient",
      },
    });
    const ingredientProduct = await prisma.product.create({
      data: {
        code: `ING-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "นมสด", en: "Fresh Milk" },
        product_type_id: ingredientType.id,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    await prisma.productStock.create({
      data: { product_id: ingredientProduct.id, warehouse_id: fx.warehouseId, current_stock: 8600 },
    });

    const res = await listProducts(
      new NextRequest(`http://localhost/api/products?warehouseId=${fx.warehouseId}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const item = body.items.find((p: { id: string }) => p.id === ingredientProduct.id);
    expect(item).toBeDefined();
    expect(Number(item.current_stock)).toBe(8600);
    expect(item.available_quantity).toBe(8600);
  });

  it("reports available_quantity equal to current_stock for a 'container' type product", async () => {
    const containerType = await prisma.productType.create({
      data: {
        code: `CONT-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "ภาชนะ", en: "Container" },
        type: "container",
      },
    });
    const containerProduct = await prisma.product.create({
      data: {
        code: `CUP-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "แก้วพลาสติก", en: "Plastic Cup" },
        product_type_id: containerType.id,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    await prisma.productStock.create({
      data: { product_id: containerProduct.id, warehouse_id: fx.warehouseId, current_stock: 300 },
    });

    const res = await listProducts(
      new NextRequest(`http://localhost/api/products?warehouseId=${fx.warehouseId}`),
    );
    const body = await res.json();
    const item = body.items.find((p: { id: string }) => p.id === containerProduct.id);
    expect(item.available_quantity).toBe(300);
  });
});
