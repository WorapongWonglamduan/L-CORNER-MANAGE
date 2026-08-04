import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as listProducts } from "@/app/api/products/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// A SEMI_FINISHED product's own current_stock only reflects units pre-made
// via /api/production — a shop that always makes it fresh per order never
// touches that field, so it can sit at 0 while the recipe's ingredients
// still allow plenty of servings. Stock-status filtering and display must
// go by available_quantity (the ingredient-based figure), not current_stock,
// or a fully-sellable item gets misclassified as "out of stock".
describe("GET /api/products - stock status for semi-finished products", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let semiProductId: string;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["products.view"],
        shopId: fx.shopId,
      }),
    );

    const ingredient = await prisma.product.create({
      data: {
        shop_id: fx.shopId,
        code: `ING-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "วัตถุดิบทดสอบ", en: "Test Ingredient" },
        product_type_id: fx.productTypeId,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    await prisma.productStock.create({
      data: { product_id: ingredient.id, warehouse_id: fx.warehouseId, current_stock: 500 },
    });

    const semiType = await prisma.productType.create({
      data: {
        shop_id: fx.shopId,
        code: `SEMI-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "กึ่งสำเร็จรูป", en: "Semi Finished" },
        type: "semi_finished",
      },
    });
    const semiProduct = await prisma.product.create({
      data: {
        shop_id: fx.shopId,
        code: `SEMIP-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "ชาเขียว", en: "Green Tea" },
        product_type_id: semiType.id,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    semiProductId = semiProduct.id;
    // current_stock intentionally left at 0 (never produced ahead of time).
    await prisma.productStock.create({
      data: { product_id: semiProductId, warehouse_id: fx.warehouseId, current_stock: 0 },
    });

    const recipe = await prisma.recipe.create({
      data: {
        product_id: semiProductId,
        name_i18n: { th: "สูตรทดสอบ", en: "Test Recipe" },
        is_default: true,
        is_active: true,
      },
    });
    await prisma.recipeIngredient.create({
      data: {
        recipe_id: recipe.id,
        ingredient_id: ingredient.id,
        quantity: 10, // 500 / 10 = 50 servings available
        unit_id: fx.unitId,
      },
    });
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reports available_quantity from ingredient stock, not the (unused) current_stock field", async () => {
    const res = await listProducts(
      new NextRequest(`http://localhost/api/products?warehouseId=${fx.warehouseId}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const semi = body.items.find((p: { id: string }) => p.id === semiProductId);
    expect(semi).toBeDefined();
    expect(Number(semi.current_stock)).toBe(0);
    expect(semi.available_quantity).toBe(50);
  });

  it("does not classify a sellable semi-finished product as out of stock", async () => {
    const res = await listProducts(
      new NextRequest(`http://localhost/api/products?warehouseId=${fx.warehouseId}&stockStatus=out`),
    );
    const body = await res.json();
    const ids = body.items.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(semiProductId);
  });

  it("includes the sellable semi-finished product under a normal-stock filter", async () => {
    const res = await listProducts(
      new NextRequest(`http://localhost/api/products?warehouseId=${fx.warehouseId}&stockStatus=normal`),
    );
    const body = await res.json();
    const ids = body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(semiProductId);
  });
});
