import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PUT as putProduct } from "@/app/api/products/[id]/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// The product-edit form always resends a freshly-built `recipes` array on
// every save of a semi-finished product, even a plain price/name edit that
// never touched the recipe section. PUT /api/products/[id] used to delete
// and recreate the Recipe row every time this happened, which — since
// SaleItem.recipe_id -> Recipe is ON DELETE SET NULL — silently erased the
// recipe reference from every past sale that used it. It must now update
// the existing Recipe row in place instead.
describe("PUT /api/products/[id] - preserves recipe history on routine edits", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let semiProductId: string;
  let recipeId: string;
  let ingredientId: string;

  beforeEach(async () => {
    fx = await seedBasics(10);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["products.view", "products.update"] }),
    );

    const ingredient = await prisma.product.create({
      data: {
        code: `ING-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "วัตถุดิบ", en: "Ingredient" },
        product_type_id: fx.productTypeId,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    ingredientId = ingredient.id;
    await prisma.productStock.create({
      data: { product_id: ingredient.id, warehouse_id: fx.warehouseId, current_stock: 100 },
    });

    const semiType = await prisma.productType.create({
      data: {
        code: `SEMI-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "กึ่งสำเร็จรูป", en: "Semi Finished" },
        type: "semi_finished",
      },
    });
    const semiProduct = await prisma.product.create({
      data: {
        code: `SEMIP-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "ชาเขียว", en: "Green Tea" },
        product_type_id: semiType.id,
        base_unit_id: fx.unitId,
        selling_price: 50,
        track_stock: true,
      },
    });
    semiProductId = semiProduct.id;
    await prisma.productStock.create({
      data: { product_id: semiProductId, warehouse_id: fx.warehouseId, current_stock: 0 },
    });

    const recipe = await prisma.recipe.create({
      data: {
        product_id: semiProductId,
        name_i18n: { th: "สูตรชาเขียว", en: "Green Tea Recipe" },
        is_default: true,
      },
    });
    recipeId = recipe.id;
    await prisma.recipeIngredient.create({
      data: { recipe_id: recipeId, ingredient_id: ingredientId, quantity: 10, unit_id: fx.unitId },
    });

    const sale = await prisma.sale.create({
      data: { sale_number: `SAL-${fx.userId.slice(0, 8)}`, warehouse_id: fx.warehouseId, subtotal: 50, total_amount: 50 },
    });
    await prisma.saleItem.create({
      data: {
        sale_id: sale.id,
        product_id: semiProductId,
        recipe_id: recipeId,
        quantity: 1,
        unit_price: 50,
        total_amount: 50,
      },
    });
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps the Recipe row's id (and past SaleItem.recipe_id) when only the price changes", async () => {
    const semiProduct = await prisma.product.findUnique({ where: { id: semiProductId } });
    const res = await putProduct(
      new NextRequest(`http://localhost/api/products/${semiProductId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: `SEMIP-${fx.productId.slice(0, 8)}`,
          name_i18n: { th: "ชาเขียว", en: "Green Tea" },
          product_type_id: semiProduct!.product_type_id,
          base_unit_id: fx.unitId,
          is_active: true,
          has_serial: false,
          has_expiry: false,
          track_stock: true,
          selling_price: 60,
          cost_price: null,
          recipes: [
            {
              name_i18n: { th: "สูตรชาเขียว", en: "Green Tea Recipe" },
              is_default: true,
              serving_qty: 1,
              serving_unit_id: fx.unitId,
              ingredients: [{ ingredient_id: ingredientId, quantity: 10, unit_id: fx.unitId }],
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: semiProductId }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Number(body.selling_price)).toBe(60);

    const stillRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    expect(stillRecipe).not.toBeNull();

    const saleItem = await prisma.saleItem.findFirst({ where: { product_id: semiProductId } });
    expect(saleItem?.recipe_id).toBe(recipeId);
  });
});
