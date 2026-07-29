import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createTopping } from "@/app/api/toppings/route";
import { PUT as updateTopping } from "@/app/api/toppings/[id]/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// A negative quantity_per_serving would make deductToppingStock's decrement
// in sales/route.ts an increment instead (manufacturing stock on every
// sale); a negative price silently deflates a sale's recorded total. Both
// are now rejected on create and update.
describe("Topping quantity/price/ingredient validation", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(100);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        permissions: ["products.view", "products.create", "products.update"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a non-positive quantity_per_serving on create", async () => {
    const res = await createTopping(
      jsonRequest("/api/toppings", "POST", {
        name_i18n: { th: "ท้อปปิ้ง", en: "Topping" },
        price: 10,
        ingredient_id: fx.productId,
        quantity_per_serving: -1,
      }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.topping.count()).toBe(0);
  });

  it("rejects a negative price on create", async () => {
    const res = await createTopping(
      jsonRequest("/api/toppings", "POST", {
        name_i18n: { th: "ท้อปปิ้ง", en: "Topping" },
        price: -5,
        ingredient_id: fx.productId,
        quantity_per_serving: 1,
      }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.topping.count()).toBe(0);
  });

  it("rejects a non-positive quantity_per_serving on update", async () => {
    const topping = await prisma.topping.create({
      data: {
        name_i18n: { th: "ท้อปปิ้ง", en: "Topping" },
        price: 10,
        ingredient_id: fx.productId,
        quantity_per_serving: 1,
      },
    });

    const res = await updateTopping(
      jsonRequest(`/api/toppings/${topping.id}`, "PUT", { quantity_per_serving: 0 }),
      { params: Promise.resolve({ id: topping.id }) },
    );
    expect(res.status).toBe(400);

    const stillOriginal = await prisma.topping.findUnique({ where: { id: topping.id } });
    expect(Number(stillOriginal?.quantity_per_serving)).toBe(1);
  });

  it("rejects re-assigning a topping's ingredient to a semi-finished product on update", async () => {
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

    const topping = await prisma.topping.create({
      data: {
        name_i18n: { th: "ท้อปปิ้ง", en: "Topping" },
        price: 10,
        ingredient_id: fx.productId,
        quantity_per_serving: 1,
      },
    });

    const res = await updateTopping(
      jsonRequest(`/api/toppings/${topping.id}`, "PUT", { ingredient_id: semiProduct.id }),
      { params: Promise.resolve({ id: topping.id }) },
    );
    expect(res.status).toBe(400);

    const stillOriginal = await prisma.topping.findUnique({ where: { id: topping.id } });
    expect(stillOriginal?.ingredient_id).toBe(fx.productId);
  });
});
