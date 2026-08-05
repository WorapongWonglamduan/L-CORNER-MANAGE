import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createShop } from "@/app/api/admin/shops/route";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { fakeSession, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";
import { randomUUID } from "crypto";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

describe("POST /api/admin/shops - product type provisioning", () => {
  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("seeds the 4 product types a shop needs to create products, so a brand-new shop is never stuck with an empty product-type dropdown", async () => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: "super-admin", isSuperAdmin: true }),
    );

    const suffix = randomUUID().slice(0, 8);
    const res = await createShop(
      new NextRequest("http://localhost/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_th: `ร้านทดสอบ-${suffix}`,
          name_en: `Test Shop ${suffix}`,
          branch_code: "WH001",
          branch_name_th: "สาขาหลัก",
          branch_name_en: "Main Branch",
          owner_email: `owner-${suffix}@example.com`,
          owner_username: `owner-${suffix}`,
          owner_password: "password123",
          owner_full_name: "Test Owner",
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();

    const productTypes = await prisma.productType.findMany({
      where: { shop_id: body.shop.id },
    });

    const types = productTypes.map((pt) => pt.type).sort();
    expect(types).toEqual(
      [
        PRODUCTS_TYPES.CONTAINER,
        PRODUCTS_TYPES.FINISHED_GOOD,
        PRODUCTS_TYPES.INGREDIENT,
        PRODUCTS_TYPES.SEMI_FINISHED,
      ].sort(),
    );
  });
});
