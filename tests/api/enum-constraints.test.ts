import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedBasics, resetDb } from "../helpers/fixtures";

// Sale.status/payment_status and Promotion.discount_type are now real
// Postgres enums (SaleStatus/PaymentStatus/DiscountType), not plain
// strings — app-level allow-lists (PUT /api/sales/[id], POST/PUT
// /api/promotions) still produce the clean 400s, but this proves the
// database itself now rejects a bad value too, as a backstop for any
// future code path that forgets to validate.
describe("DB-level enum constraints", () => {
  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects an invalid Sale.status value at the database level", async () => {
    const fx = await seedBasics(1);
    const sale = await prisma.sale.create({
      data: {
        sale_number: `SAL-${fx.userId.slice(0, 8)}`,
        warehouse_id: fx.warehouseId,
        subtotal: 10,
        total_amount: 10,
      },
    });

    await expect(
      prisma.sale.update({
        where: { id: sale.id },
        // @ts-expect-error intentionally invalid to prove the DB rejects it
        data: { status: "not-a-real-status" },
      }),
    ).rejects.toThrow();
  });

  it("rejects an invalid Promotion.discount_type value at the database level", async () => {
    const shop = await prisma.shop.create({
      data: { name_i18n: { th: "ร้านทดสอบ", en: "Test Shop" }, is_active: true },
    });

    await expect(
      prisma.promotion.create({
        data: {
          shop_id: shop.id,
          code: "BADTYPE",
          name_i18n: { th: "โปร", en: "Promo" },
          // @ts-expect-error intentionally invalid to prove the DB rejects it
          discount_type: "not-a-real-type",
          discount_value: 10,
        },
      }),
    ).rejects.toThrow();
  });
});
