import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PUT as putUser, DELETE as deleteUser } from "@/app/api/users/[id]/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// Nothing in the app can undo a self-deactivation or a self-stripped-to-zero
// role set — there's no in-app recovery path — so a single careless action
// by the only admin would lock out every admin function for everyone with
// no way back in except direct DB surgery. These must be blocked server-side
// regardless of what the UI does or doesn't grey out.
describe("Self-lockout guards on user management", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let roleId: string;

  beforeEach(async () => {
    fx = await seedBasics(10);
    const role = await prisma.role.create({
      data: {
        name: `admin-${fx.userId.slice(0, 8)}`,
        display_name_i18n: { th: "แอดมิน", en: "Admin" },
        permissions: ["users.update", "users.delete"],
      },
    });
    roleId = role.id;
    await prisma.userRole.create({ data: { user_id: fx.userId, role_id: roleId } });

    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        permissions: ["users.update", "users.delete"],
      }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("DELETE /api/users/[id] refuses to deactivate the caller's own account", async () => {
    const res = await deleteUser(
      new NextRequest(`http://localhost/api/users/${fx.userId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: fx.userId }) },
    );
    expect(res.status).toBe(400);

    const stillActive = await prisma.user.findUnique({ where: { id: fx.userId } });
    expect(stillActive?.is_active).toBe(true);
  });

  it("PUT /api/users/[id] refuses is_active:false on the caller's own account", async () => {
    const res = await putUser(
      new NextRequest(`http://localhost/api/users/${fx.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      }),
      { params: Promise.resolve({ id: fx.userId }) },
    );
    expect(res.status).toBe(400);

    const stillActive = await prisma.user.findUnique({ where: { id: fx.userId } });
    expect(stillActive?.is_active).toBe(true);
  });

  it("PUT /api/users/[id] refuses to strip all of the caller's own roles", async () => {
    const res = await putUser(
      new NextRequest(`http://localhost/api/users/${fx.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_ids: [] }),
      }),
      { params: Promise.resolve({ id: fx.userId }) },
    );
    expect(res.status).toBe(400);

    const stillHasRole = await prisma.userRole.findFirst({ where: { user_id: fx.userId } });
    expect(stillHasRole).not.toBeNull();
  });

  it("still allows deactivating a DIFFERENT user", async () => {
    const other = await prisma.user.create({
      data: {
        username: `other-${fx.userId.slice(0, 8)}`,
        email: `other-${fx.userId.slice(0, 8)}@example.com`,
        password: "not-a-real-hash",
        full_name: "Other User",
      },
    });

    const res = await deleteUser(
      new NextRequest(`http://localhost/api/users/${other.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: other.id }) },
    );
    expect(res.status).toBe(200);

    const stillActive = await prisma.user.findUnique({ where: { id: other.id } });
    expect(stillActive?.is_active).toBe(false);
  });
});
