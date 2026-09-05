import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createSale } from "@/app/api/sales/route";
import { POST as refundSale } from "@/app/api/sales/[id]/refund/route";
import { DELETE as voidSale } from "@/app/api/sales/[id]/route";
import { GET as listMovements } from "@/app/api/inventory/movements/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// A SEMI_FINISHED ("ปรุง") product never gets its own StockMovement rows on
// sale — createCompletedSale() deducts its recipe's ingredients instead
// (see the comment in create-sale.ts). Before this fix, GET
// /api/inventory/movements?product_id=<semi-finished product> always came
// back empty, even right after a real sale, because it filtered strictly
// on product_id. This suite checks the fix: the endpoint now resolves a
// SEMI_FINISHED product's own sale_items and pulls in the ingredient
// movements those specific items caused (via reference_type "sale_item"),
// while staying precise about *which* item — a second product sharing the
// same ingredient must not leak into this product's history.
describe("GET /api/inventory/movements - semi-finished product history", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let semiProductId: string;
  let otherSemiProductId: string;
  let ingredientId: string;

  beforeEach(async () => {
    fx = await seedBasics(1);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: [
          "sales.create",
          "sales.refund",
          "sales.void",
          "inventory.view",
        ],
        shopId: fx.shopId,
      }),
    );

    const ingredient = await prisma.product.create({
      data: {
        shop_id: fx.shopId,
        code: `ING-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "น้ำเปล่า", en: "Water" },
        product_type_id: fx.productTypeId,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    ingredientId = ingredient.id;
    await prisma.productStock.create({
      data: { product_id: ingredientId, warehouse_id: fx.warehouseId, current_stock: 1000 },
    });

    const semiType = await prisma.productType.create({
      data: {
        shop_id: fx.shopId,
        code: `SEMI-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "กึ่งสำเร็จรูป", en: "Semi Finished" },
        type: "semi_finished",
      },
    });

    // Two different semi-finished products, both using the SAME ingredient
    // — the scenario that would leak history between products if
    // attribution fell back to "any movement on this ingredient".
    semiProductId = (
      await prisma.product.create({
        data: {
          shop_id: fx.shopId,
          code: `TEA-${fx.productId.slice(0, 8)}`,
          name_i18n: { th: "ชา", en: "Tea" },
          product_type_id: semiType.id,
          base_unit_id: fx.unitId,
          selling_price: 20,
          track_stock: true,
        },
      })
    ).id;
    otherSemiProductId = (
      await prisma.product.create({
        data: {
          shop_id: fx.shopId,
          code: `COFFEE-${fx.productId.slice(0, 8)}`,
          name_i18n: { th: "กาแฟ", en: "Coffee" },
          product_type_id: semiType.id,
          base_unit_id: fx.unitId,
          selling_price: 25,
          track_stock: true,
        },
      })
    ).id;

    const teaRecipe = await prisma.recipe.create({
      data: {
        product_id: semiProductId,
        name_i18n: { th: "สูตรชา", en: "Tea Recipe" },
        is_default: true,
        is_active: true,
      },
    });
    await prisma.recipeIngredient.create({
      data: { recipe_id: teaRecipe.id, ingredient_id: ingredientId, quantity: 10, unit_id: fx.unitId },
    });

    const coffeeRecipe = await prisma.recipe.create({
      data: {
        product_id: otherSemiProductId,
        name_i18n: { th: "สูตรกาแฟ", en: "Coffee Recipe" },
        is_default: true,
        is_active: true,
      },
    });
    await prisma.recipeIngredient.create({
      data: { recipe_id: coffeeRecipe.id, ingredient_id: ingredientId, quantity: 15, unit_id: fx.unitId },
    });
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("shows the ingredient movement a sale of this product caused, not an empty history", async () => {
    const saleRes = await createSale(
      jsonRequest("/api/sales", "POST", {
        warehouse_id: fx.warehouseId,
        items: [{ product_id: semiProductId, quantity: 2 }],
        payment_method: "cash",
      }),
    );
    expect(saleRes.status).toBe(201);
    const sale = await saleRes.json();

    const res = await listMovements(
      new NextRequest(`http://localhost/api/inventory/movements?product_id=${semiProductId}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.items.length).toBe(1);
    const movement = body.items[0];
    expect(movement.movement_type).toBe("sale");
    expect(movement.direction).toBe("out");
    expect(Number(movement.quantity_change)).toBe(20); // 10 per unit * 2
    // The row is physically about the ingredient, not the semi-finished
    // product itself — the API must say so via `product` so the UI can
    // label it correctly instead of assuming every row matches the
    // requested product.
    expect(movement.product_id).toBe(ingredientId);
    expect(movement.product.id).toBe(ingredientId);
    expect(movement.reference_type).toBe("sale_item");
    expect(movement.reference_id).toBe(sale.items[0].id);
  });

  it("does not leak another product's consumption of the same shared ingredient", async () => {
    await createSale(
      jsonRequest("/api/sales", "POST", {
        warehouse_id: fx.warehouseId,
        items: [{ product_id: otherSemiProductId, quantity: 5 }],
        payment_method: "cash",
      }),
    );

    const res = await listMovements(
      new NextRequest(`http://localhost/api/inventory/movements?product_id=${semiProductId}`),
    );
    const body = await res.json();

    // Coffee's own sale deducted the shared ingredient too, but none of
    // that belongs to Tea's history.
    expect(body.items.length).toBe(0);
  });

  it("also attributes a void's restore movement to the specific sale item", async () => {
    const saleRes = await createSale(
      jsonRequest("/api/sales", "POST", {
        warehouse_id: fx.warehouseId,
        items: [{ product_id: semiProductId, quantity: 1 }],
        payment_method: "cash",
      }),
    );
    const sale = await saleRes.json();

    await voidSale(
      new NextRequest(`http://localhost/api/sales/${sale.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: sale.id }) },
    );

    const res = await listMovements(
      new NextRequest(`http://localhost/api/inventory/movements?product_id=${semiProductId}`),
    );
    const body = await res.json();

    expect(body.items.length).toBe(2); // original deduction + void restore
    const restore = body.items.find((m: { movement_type: string }) => m.movement_type === "return");
    expect(restore).toBeTruthy();
    expect(restore.reference_type).toBe("sale_item");
    expect(restore.reference_id).toBe(sale.items[0].id);
  });

  it("also attributes a refund's restore movement to the specific sale item", async () => {
    const saleRes = await createSale(
      jsonRequest("/api/sales", "POST", {
        warehouse_id: fx.warehouseId,
        items: [{ product_id: semiProductId, quantity: 4 }],
        payment_method: "cash",
      }),
    );
    const sale = await saleRes.json();

    await refundSale(
      jsonRequest(`/api/sales/${sale.id}/refund`, "POST", {
        items: [{ sale_item_id: sale.items[0].id, quantity: 4 }],
      }),
      { params: Promise.resolve({ id: sale.id }) },
    );

    const res = await listMovements(
      new NextRequest(`http://localhost/api/inventory/movements?product_id=${semiProductId}`),
    );
    const body = await res.json();

    expect(body.items.length).toBe(2); // original deduction + refund restore
    const restore = body.items.find((m: { movement_type: string }) => m.movement_type === "return");
    expect(restore).toBeTruthy();
    expect(restore.reference_type).toBe("sale_item");
    expect(restore.reference_id).toBe(sale.items[0].id);
  });
});
