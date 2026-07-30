import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GET as listProducts } from "@/app/api/products/route";
import { POST as createSale } from "@/app/api/sales/route";
import { POST as refundSale } from "@/app/api/sales/[id]/refund/route";
import { DELETE as voidSale } from "@/app/api/sales/[id]/route";
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

// available_quantity (products/route.ts) is a *derived* number, recomputed
// fresh from ProductStock.current_stock on every request — it's never
// stored/cached. Refund and void restore that same current_stock field
// directly (unrelated to the available_quantity display fix), so this
// verifies the two are still correctly connected end-to-end: a refund or
// void must make available_quantity go back up, not just leave the
// restored ingredient stock invisible to the API/UI.
describe("available_quantity reflects refund/void stock restoration", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let semiProductId: string;
  let ingredientId: string;

  beforeEach(async () => {
    fx = await seedBasics(1);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["products.view", "sales.create", "sales.refund", "sales.void"],
      }),
    );

    const ingredient = await prisma.product.create({
      data: {
        code: `ING-${fx.productId.slice(0, 8)}`,
        name_i18n: { th: "วัตถุดิบทดสอบ", en: "Test Ingredient" },
        product_type_id: fx.productTypeId,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    ingredientId = ingredient.id;
    await prisma.productStock.create({
      data: { product_id: ingredientId, warehouse_id: fx.warehouseId, current_stock: 100 },
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
        selling_price: 20,
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
        name_i18n: { th: "สูตรทดสอบ", en: "Test Recipe" },
        is_default: true,
        is_active: true,
      },
    });
    await prisma.recipeIngredient.create({
      data: { recipe_id: recipe.id, ingredient_id: ingredientId, quantity: 10, unit_id: fx.unitId },
    });
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function getAvailableQuantity() {
    const res = await listProducts(
      new NextRequest(`http://localhost/api/products?warehouseId=${fx.warehouseId}`),
    );
    const body = await res.json();
    return body.items.find((p: { id: string }) => p.id === semiProductId).available_quantity;
  }

  it("goes back up after a refund restores the ingredient stock it consumed", async () => {
    expect(await getAvailableQuantity()).toBe(10); // 100 / 10

    const saleRes = await createSale(
      jsonRequest("/api/sales", "POST", {
        warehouse_id: fx.warehouseId,
        items: [{ product_id: semiProductId, quantity: 3 }],
        payment_method: "cash",
      }),
    );
    expect(saleRes.status).toBe(201);
    const sale = await saleRes.json();
    expect(await getAvailableQuantity()).toBe(7); // (100 - 30) / 10

    const refundRes = await refundSale(
      jsonRequest(`/api/sales/${sale.id}/refund`, "POST", {
        items: [{ sale_item_id: sale.items[0].id, quantity: 3 }],
      }),
      { params: Promise.resolve({ id: sale.id }) },
    );
    expect(refundRes.status).toBe(201);
    expect(await getAvailableQuantity()).toBe(10); // fully restored
  });

  it("goes back up after voiding a sale restores the ingredient stock it consumed", async () => {
    const saleRes = await createSale(
      jsonRequest("/api/sales", "POST", {
        warehouse_id: fx.warehouseId,
        items: [{ product_id: semiProductId, quantity: 2 }],
        payment_method: "cash",
      }),
    );
    const sale = await saleRes.json();
    expect(await getAvailableQuantity()).toBe(8); // (100 - 20) / 10

    const voidRes = await voidSale(
      new NextRequest(`http://localhost/api/sales/${sale.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: sale.id }) },
    );
    expect(voidRes.status).toBe(200);
    expect(await getAvailableQuantity()).toBe(10); // fully restored
  });
});
