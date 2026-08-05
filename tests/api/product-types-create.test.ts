import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createProductType } from "@/app/api/product-types/route";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/product-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/product-types", () => {
  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates the generic \"product\" type even when the request has no type field — this endpoint deliberately never lets a shop pick semi_finished/finished_good/ingredient/container themselves", async () => {
    const fx = await seedBasics();
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["settings.update"], shopId: fx.shopId }),
    );

    const res = await createProductType(
      postRequest({ code: `NEW-${fx.shopId.slice(0, 8)}`, name_i18n: { th: "ทดสอบ", en: "Test" } }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe(PRODUCTS_TYPES.PRODUCT);
  });

  it("allows two different shops to use the identical product type code (code is only unique per shop, not system-wide)", async () => {
    const shopA = await seedBasics();
    const shopB = await seedBasics();

    mockedAuth.mockResolvedValue(
      fakeSession({ userId: shopA.userId, permissions: ["settings.update"], shopId: shopA.shopId }),
    );
    const resA = await createProductType(
      postRequest({ code: "SHARED_CODE", name_i18n: { th: "ก", en: "A" } }),
    );
    expect(resA.status).toBe(201);

    mockedAuth.mockResolvedValue(
      fakeSession({ userId: shopB.userId, permissions: ["settings.update"], shopId: shopB.shopId }),
    );
    const resB = await createProductType(
      postRequest({ code: "SHARED_CODE", name_i18n: { th: "ข", en: "B" } }),
    );
    expect(resB.status).toBe(201);
  });

  it("still rejects a duplicate code within the same shop", async () => {
    const fx = await seedBasics();
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["settings.update"], shopId: fx.shopId }),
    );

    const code = `DUP-${fx.shopId.slice(0, 8)}`;
    const first = await createProductType(postRequest({ code, name_i18n: { th: "หนึ่ง", en: "One" } }));
    expect(first.status).toBe(201);

    const second = await createProductType(postRequest({ code, name_i18n: { th: "สอง", en: "Two" } }));
    expect(second.status).toBe(400);
  });
});
