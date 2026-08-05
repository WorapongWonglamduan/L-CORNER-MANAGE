import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as createProductType } from "@/app/api/product-types/route";
import { seedBasics, resetDb } from "../helpers/fixtures";

// The route module's GET handler still imports "@/auth" — mocked here
// purely so the real next-auth module (which this test never exercises,
// since POST doesn't call auth() at all) doesn't get loaded transitively.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// Product types are provisioned once per shop at shop-creation time
// (api/admin/shops/route.ts) and never change afterward — see the POST
// handler's own comment for why. This endpoint has no create path at all.
describe("POST /api/product-types", () => {
  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("always rejects with 403 and creates nothing", async () => {
    const fx = await seedBasics();

    const res = await createProductType();

    expect(res.status).toBe(403);

    const countAfter = await prisma.productType.count({ where: { shop_id: fx.shopId } });
    expect(countAfter).toBe(1); // only the one seedBasics already created
  });
});
