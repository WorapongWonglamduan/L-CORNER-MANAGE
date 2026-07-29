import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DELETE as deleteRecipe } from "@/app/api/recipes/[id]/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// SaleItem.recipe_id -> Recipe is ON DELETE SET NULL — hard-deleting a
// recipe used in a past sale would silently null out recipe_id on that
// historical sale item, degrading the audit trail (which recipe/version
// produced a past semi-finished sale). Same bug class as the units
// hard-delete gap fixed earlier.
describe("DELETE /api/recipes/[id]", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(10);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["products.view", "products.update"] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blocks deleting a recipe that's used in a past sale item", async () => {
    const recipe = await prisma.recipe.create({
      data: { product_id: fx.productId, name_i18n: { th: "สูตร", en: "Recipe" }, is_default: true },
    });
    const sale = await prisma.sale.create({
      data: { sale_number: `SAL-${fx.userId.slice(0, 8)}`, warehouse_id: fx.warehouseId, subtotal: 10, total_amount: 10 },
    });
    await prisma.saleItem.create({
      data: {
        sale_id: sale.id,
        product_id: fx.productId,
        recipe_id: recipe.id,
        quantity: 1,
        unit_price: 10,
        total_amount: 10,
      },
    });

    const res = await deleteRecipe(
      new NextRequest(`http://localhost/api/recipes/${recipe.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: recipe.id }) },
    );
    expect(res.status).toBe(400);

    const stillRecipe = await prisma.recipe.findUnique({ where: { id: recipe.id } });
    expect(stillRecipe).not.toBeNull();
  });

  it("allows deleting a recipe never used in any sale", async () => {
    const recipe = await prisma.recipe.create({
      data: { product_id: fx.productId, name_i18n: { th: "สูตร", en: "Recipe" }, is_default: true },
    });

    const res = await deleteRecipe(
      new NextRequest(`http://localhost/api/recipes/${recipe.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: recipe.id }) },
    );
    expect(res.status).toBe(200);

    const stillRecipe = await prisma.recipe.findUnique({ where: { id: recipe.id } });
    expect(stillRecipe).toBeNull();
  });
});
