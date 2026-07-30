import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createCategory } from "@/app/api/categories/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

describe("POST /api/categories - parent_id validation", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(10);
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["settings.view", "settings.update"] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a non-existent parent_id with a clean 400 instead of a raw FK 500", async () => {
    const res = await createCategory(
      new NextRequest("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_i18n: { th: "ทดสอบ", en: "Test" }, parent_id: "does-not-exist" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("still allows creating a category with a real parent_id", async () => {
    const parent = await prisma.category.create({
      data: { name_i18n: { th: "หลัก", en: "Root" } },
    });

    const res = await createCategory(
      new NextRequest("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_i18n: { th: "ลูก", en: "Child" }, parent_id: parent.id }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.parent_id).toBe(parent.id);
  });
});
