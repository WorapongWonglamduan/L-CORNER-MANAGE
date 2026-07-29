import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createTransfer } from "@/app/api/inventory/transfers/route";
import { POST as runProduction } from "@/app/api/production/route";
import { POST as createSale } from "@/app/api/sales/route";
import { fakeSession, seedBasics, currentStock, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

afterAll(async () => {
  await prisma.$disconnect();
});

// Regression coverage for three more read-then-write races found in the same
// audit pass that fixed the refund/void concurrency bugs: stock transfers,
// production runs, and promotion-code redemption all used to read a
// counter, decide, and write an absolute value across separate statements —
// two concurrent requests could both read the same "before" value and both
// pass validation, corrupting stock or over-redeeming a single-use code.

describe("POST /api/inventory/transfers - concurrency", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let otherWarehouseId: string;

  beforeEach(async () => {
    fx = await seedBasics(10); // only 10 units at the source warehouse
    const other = await prisma.warehouse.create({
      data: { code: `WHT2-${fx.userId.slice(0, 8)}`, name_i18n: { th: "คลัง 2", en: "Warehouse 2" } },
    });
    otherWarehouseId = other.id;
    await prisma.userWarehouse.create({
      data: { user_id: fx.userId, warehouse_id: otherWarehouseId },
    });

    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId, otherWarehouseId],
        permissions: ["inventory.transfer", "inventory.view"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("never lets two concurrent transfers move more than the source warehouse holds", async () => {
    const transferReq = () =>
      createTransfer(
        new NextRequest("http://localhost/api/inventory/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_warehouse_id: fx.warehouseId,
            to_warehouse_id: otherWarehouseId,
            product_id: fx.productId,
            quantity: 6, // 6 + 6 = 12 > 10 available
          }),
        }),
      );

    const [r1, r2] = await Promise.all([transferReq(), transferReq()]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 500]); // the loser throws inside the transaction -> 500

    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(4); // 10 - 6
    expect(await currentStock(fx.productId, otherWarehouseId)).toBe(6);
  });
});

describe("POST /api/production - concurrency", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let semiProductId: string;
  let ingredientId: string;

  beforeEach(async () => {
    fx = await seedBasics(100);

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
      data: { product_id: ingredientId, warehouse_id: fx.warehouseId, current_stock: 10 },
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
        name_i18n: { th: "สินค้ากึ่งสำเร็จรูป", en: "Semi Product" },
        product_type_id: semiType.id,
        base_unit_id: fx.unitId,
        track_stock: true,
      },
    });
    semiProductId = semiProduct.id;

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
        ingredient_id: ingredientId,
        quantity: 6, // 6 per unit produced; only 10 in stock
        unit_id: fx.unitId,
      },
    });

    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["inventory.adjust", "inventory.view"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("never lets two concurrent production runs consume more ingredient stock than exists", async () => {
    const produceReq = () =>
      runProduction(
        new NextRequest("http://localhost/api/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: semiProductId,
            warehouse_id: fx.warehouseId,
            quantity: 1, // needs 6 ingredient units each; 6+6=12 > 10 available
          }),
        }),
      );

    const [r1, r2] = await Promise.all([produceReq(), produceReq()]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 400]);

    expect(await currentStock(ingredientId, fx.warehouseId)).toBe(4); // 10 - 6
    expect(await currentStock(semiProductId, fx.warehouseId)).toBe(1);
  });
});

describe("POST /api/sales - promotion concurrency", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let promoCode: string;

  beforeEach(async () => {
    fx = await seedBasics(100);
    promoCode = `PROMO${fx.productId.slice(0, 6).toUpperCase()}`;
    await prisma.promotion.create({
      data: {
        code: promoCode,
        name_i18n: { th: "โปรโมชั่นทดสอบ", en: "Test Promotion" },
        discount_type: "fixed",
        discount_value: 5,
        max_uses: 1,
        used_count: 0,
        is_active: true,
      },
    });

    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["sales.create", "sales.view"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("never lets two concurrent sales redeem a single-use promotion twice", async () => {
    const saleReq = () =>
      createSale(
        new NextRequest("http://localhost/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouse_id: fx.warehouseId,
            items: [{ product_id: fx.productId, quantity: 1 }],
            payment_method: "cash",
            promotion_code: promoCode,
          }),
        }),
      );

    const [r1, r2] = await Promise.all([saleReq(), saleReq()]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 500]); // loser's thrown Error surfaces as 500

    const promotion = await prisma.promotion.findUnique({ where: { code: promoCode } });
    expect(promotion?.used_count).toBe(1);
  });
});
