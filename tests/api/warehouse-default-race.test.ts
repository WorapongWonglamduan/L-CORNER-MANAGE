import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createWarehouse } from "@/app/api/warehouses/route";
import { fakeSession, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// "Unset every other default, then create/update this one as the default"
// used to be two separate statements with no isolation guard — two admins
// each creating a different warehouse as the new default at the same
// moment could both commit, since each transaction's updateMany only sees
// defaults that existed in its own snapshot, never the other transaction's
// brand-new row. Serializable + retry closes this the same way the
// refund/void/production/transfer/promotion races were fixed.
describe("POST /api/warehouses - only one default warehouse at a time", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: "test-user", permissions: ["settings.update", "settings.view"] }),
    );
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("never lets two concurrently-created warehouses both end up as the default", async () => {
    const [r1, r2] = await Promise.all([
      createWarehouse(
        jsonRequest("/api/warehouses", {
          code: "WHA",
          name_i18n: { th: "สาขา A", en: "Branch A" },
          is_default: true,
        }),
      ),
      createWarehouse(
        jsonRequest("/api/warehouses", {
          code: "WHB",
          name_i18n: { th: "สาขา B", en: "Branch B" },
          is_default: true,
        }),
      ),
    ]);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    const defaults = await prisma.warehouse.findMany({ where: { is_default: true } });
    expect(defaults.length).toBe(1);
  });
});
