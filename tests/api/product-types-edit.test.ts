import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PUT as putProductType } from "@/app/api/product-types/[id]/route";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// The edit form always round-trips a ProductType's existing `type` value
// (the field itself isn't editable in the UI), so a stale type whitelist
// here would reject every single edit — even a pure rename or is_active
// toggle — of any row whose type is one the whitelist forgot to list.
describe("PUT /api/product-types/[id] - type validation", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(10);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        permissions: ["settings.view", "settings.update"],
        shopId: fx.shopId,
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each([PRODUCTS_TYPES.CONTAINER, PRODUCTS_TYPES.INGREDIENT])(
    "allows round-tripping the real type value %s on an unrelated edit",
    async (type) => {
      const productType = await prisma.productType.create({
        data: {
          shop_id: fx.shopId,
          code: `PT-${fx.userId.slice(0, 8)}-${type}`,
          name_i18n: { th: "ทดสอบ", en: "Test" },
          type,
        },
      });

      const res = await putProductType(
        new NextRequest(`http://localhost/api/product-types/${productType.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name_i18n: { th: "ทดสอบใหม่", en: "Test Renamed" }, type }),
        }),
        { params: Promise.resolve({ id: productType.id }) },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name_i18n.en).toBe("Test Renamed");
      expect(body.type).toBe(type);
    },
  );

  it("rejects a genuinely invalid type value", async () => {
    const productType = await prisma.productType.create({
      data: {
        shop_id: fx.shopId,
        code: `PT-${fx.userId.slice(0, 8)}-bad`,
        name_i18n: { th: "ทดสอบ", en: "Test" },
        type: PRODUCTS_TYPES.PRODUCT,
      },
    });

    const res = await putProductType(
      new NextRequest(`http://localhost/api/product-types/${productType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "not_a_real_type" }),
      }),
      { params: Promise.resolve({ id: productType.id }) },
    );

    expect(res.status).toBe(400);
  });
});
