import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { PUT as putProductType, DELETE as deleteProductType } from "@/app/api/product-types/[id]/route";
import { seedBasics, resetDb } from "../helpers/fixtures";

// The route module's GET handler still imports "@/auth" — mocked here
// purely so the real next-auth module (which this test never exercises,
// since PUT/DELETE don't call auth() at all) doesn't get loaded transitively.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// Product types are provisioned once per shop at shop-creation time and
// never change afterward (see PUT/DELETE's own comment) — editing `type`
// on a row already in use would silently change recipe/stock behavior for
// its products, and deleting one puts the shop back in the "can't create
// a product" state this whole area was fixed for. Unconditional 403, no
// auth/ownership check needed first.
describe("PUT/DELETE /api/product-types/[id]", () => {
  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("PUT always rejects with 403 and leaves the row untouched", async () => {
    const fx = await seedBasics();
    const before = await prisma.productType.findUniqueOrThrow({ where: { id: fx.productTypeId } });

    const res = await putProductType();

    expect(res.status).toBe(403);
    const after = await prisma.productType.findUniqueOrThrow({ where: { id: fx.productTypeId } });
    expect(after.name_i18n).toEqual(before.name_i18n);
  });

  it("DELETE always rejects with 403 and leaves the row in place", async () => {
    const fx = await seedBasics();

    const res = await deleteProductType();

    expect(res.status).toBe(403);
    const stillExists = await prisma.productType.findUnique({ where: { id: fx.productTypeId } });
    expect(stillExists).not.toBeNull();
  });
});
