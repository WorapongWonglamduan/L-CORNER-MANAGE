import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createRole } from "@/app/api/roles/route";
import { PUT as updateRole } from "@/app/api/roles/[id]/route";
import { PUT as updateUser } from "@/app/api/users/[id]/route";
import { POST as createPromotion } from "@/app/api/promotions/route";
import { PUT as updatePromotion } from "@/app/api/promotions/[id]/route";
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

// This app has no permission distinct from users.* for "manage roles" — any
// role scoped to ordinary user administration (e.g. "reset passwords") also
// gates role/permission editing. Without a subset check, such a role could
// grant itself (or any user) permissions its holder doesn't have, up to and
// including full admin. These tests lock in the fix: a caller can only ever
// grant permissions they themselves already hold.
describe("Privilege escalation guards", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(1);
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blocks POST /api/roles from granting a permission the caller doesn't hold", async () => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["users.create", "users.update"], shopId: fx.shopId }),
    );

    const res = await createRole(
      jsonRequest("/api/roles", "POST", {
        name: `support-${fx.userId.slice(0, 8)}`,
        display_name_i18n: { th: "ซัพพอร์ต", en: "Support" },
        permissions: ["users.create", "users.update", "settings.update"],
      }),
    );
    expect(res.status).toBe(403);
    expect(await prisma.role.count()).toBe(0);
  });

  it("blocks PUT /api/roles/[id] from escalating an existing role beyond the caller's own permissions", async () => {
    const role = await prisma.role.create({
      data: {
        shop_id: fx.shopId,
        name: `support-${fx.userId.slice(0, 8)}`,
        display_name_i18n: { th: "ซัพพอร์ต", en: "Support" },
        permissions: ["users.update"],
        is_system: false,
      },
    });
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["users.update"], shopId: fx.shopId }),
    );

    const res = await updateRole(
      jsonRequest(`/api/roles/${role.id}`, "PUT", {
        permissions: ["users.update", "settings.update", "products.delete"],
      }),
      { params: Promise.resolve({ id: role.id }) },
    );
    expect(res.status).toBe(403);

    const stillRole = await prisma.role.findUnique({ where: { id: role.id } });
    expect(stillRole?.permissions).toEqual(["users.update"]);
  });

  it("blocks PUT /api/users/[id] from assigning a role that grants permissions the caller doesn't hold", async () => {
    const adminLikeRole = await prisma.role.create({
      data: {
        shop_id: fx.shopId,
        name: `admin-like-${fx.userId.slice(0, 8)}`,
        display_name_i18n: { th: "แอดมิน", en: "Admin-like" },
        permissions: ["users.update", "settings.update", "products.delete"],
        is_system: false,
      },
    });
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["users.update"], shopId: fx.shopId }),
    );

    const res = await updateUser(
      jsonRequest(`/api/users/${fx.userId}`, "PUT", { role_ids: [adminLikeRole.id] }),
      { params: Promise.resolve({ id: fx.userId }) },
    );
    expect(res.status).toBe(403);

    const stillRoles = await prisma.userRole.findMany({ where: { user_id: fx.userId } });
    expect(stillRoles.length).toBe(0);
  });

  it("allows granting/assigning permissions the caller already holds", async () => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["users.create", "sales.view"], shopId: fx.shopId }),
    );

    const res = await createRole(
      jsonRequest("/api/roles", "POST", {
        name: `viewer-${fx.userId.slice(0, 8)}`,
        display_name_i18n: { th: "ผู้ดู", en: "Viewer" },
        permissions: ["sales.view"],
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe("Promotion discount/max_uses validation", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(1);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["settings.view", "settings.update"], shopId: fx.shopId }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  it("rejects a negative fixed discount_value on create", async () => {
    const res = await createPromotion(
      jsonRequest("/api/promotions", "POST", {
        code: `NEG-${fx.userId.slice(0, 6)}`,
        name_i18n: { th: "โปร", en: "Promo" },
        discount_type: "fixed",
        discount_value: -100,
      }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.promotion.count()).toBe(0);
  });

  it("rejects a negative discount_value on update, even for a promo that was valid before", async () => {
    const promo = await prisma.promotion.create({
      data: {
        shop_id: fx.shopId,
        code: `POS-${fx.userId.slice(0, 6)}`,
        name_i18n: { th: "โปร", en: "Promo" },
        discount_type: "percentage",
        discount_value: 10,
      },
    });

    const res = await updatePromotion(
      jsonRequest(`/api/promotions/${promo.id}`, "PUT", { discount_value: -5 }),
      { params: Promise.resolve({ id: promo.id }) },
    );
    expect(res.status).toBe(400);

    const stillPromo = await prisma.promotion.findUnique({ where: { id: promo.id } });
    expect(Number(stillPromo?.discount_value)).toBe(10);
  });

  it("stores max_uses: 0 as literally 0, not unlimited", async () => {
    const res = await createPromotion(
      jsonRequest("/api/promotions", "POST", {
        code: `ZERO-${fx.userId.slice(0, 6)}`,
        name_i18n: { th: "โปร", en: "Promo" },
        discount_type: "fixed",
        discount_value: 10,
        max_uses: 0,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.max_uses).toBe(0);
  });
});
