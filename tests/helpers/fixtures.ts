import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/** A fake NextAuth session shaped exactly like requirePermission/
 * requireWarehouseAccess expect — auth() itself is mocked per test file
 * (vi.mock("@/auth")), this just builds the value it should resolve to. */
export function fakeSession(overrides: {
  userId: string;
  permissions?: string[];
  warehouseIds?: string[];
  shopId?: string;
  isSuperAdmin?: boolean;
}): Session {
  return {
    user: {
      id: overrides.userId,
      name: "Test User",
      email: "test@example.com",
      roles: ["tester"],
      permissions: overrides.permissions ?? [
        "sales.create",
        "sales.view",
        "sales.void",
        "inventory.view",
      ],
      warehouse_ids: overrides.warehouseIds ?? [],
      shop_id: overrides.shopId ?? null,
      is_super_admin: overrides.isSuperAdmin ?? false,
    },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

interface SeededProduct {
  warehouseId: string;
  productId: string;
  userId: string;
  unitId: string;
  productTypeId: string;
  shopId: string;
}

/** Minimal, self-contained fixture set: one warehouse, one finished-good
 * product stocked at `initialStock`, one user with access to that
 * warehouse. Every id is a fresh UUID so parallel test files never collide,
 * even though they share the same test database. */
export async function seedBasics(
  initialStock = 100,
): Promise<SeededProduct> {
  const suffix = randomUUID().slice(0, 8);

  const shop = await prisma.shop.create({
    data: {
      name_i18n: { th: `ร้านทดสอบ-${suffix}`, en: `Test Shop ${suffix}` },
      is_active: true,
    },
  });

  const unit = await prisma.unit.create({
    data: {
      shop_id: shop.id,
      name_i18n: { th: "ชิ้น", en: "piece" },
      abbreviation_i18n: { th: "ชิ้น", en: "pc" },
      is_base_unit: true,
    },
  });

  const productType = await prisma.productType.create({
    data: {
      shop_id: shop.id,
      code: `TEST-${suffix}`,
      name_i18n: { th: "ทดสอบ", en: "Test" },
      type: "finished_good",
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: {
      shop_id: shop.id,
      code: `WHT-${suffix}`,
      name_i18n: { th: "คลังทดสอบ", en: "Test Warehouse" },
    },
  });

  const product = await prisma.product.create({
    data: {
      shop_id: shop.id,
      code: `PT-${suffix}`,
      name_i18n: { th: "สินค้าทดสอบ", en: "Test Product" },
      product_type_id: productType.id,
      base_unit_id: unit.id,
      selling_price: 20,
      cost_price: 10,
      track_stock: true,
    },
  });

  await prisma.productStock.create({
    data: {
      product_id: product.id,
      warehouse_id: warehouse.id,
      current_stock: initialStock,
    },
  });

  const user = await prisma.user.create({
    data: {
      shop_id: shop.id,
      username: `tester-${suffix}`,
      email: `tester-${suffix}@example.com`,
      password: "not-a-real-hash",
      full_name: "Test User",
    },
  });

  await prisma.userWarehouse.create({
    data: { user_id: user.id, warehouse_id: warehouse.id },
  });

  return {
    warehouseId: warehouse.id,
    productId: product.id,
    userId: user.id,
    unitId: unit.id,
    productTypeId: productType.id,
    shopId: shop.id,
  };
}

export async function currentStock(productId: string, warehouseId: string) {
  const row = await prisma.productStock.findUnique({
    where: { product_id_warehouse_id: { product_id: productId, warehouse_id: warehouseId } },
  });
  return row ? Number(row.current_stock) : 0;
}

/** Deletes everything a test could plausibly have created, in FK-safe
 * order. Filters by nothing — the test DB only ever holds fixture data, so
 * a full wipe between tests is simpler and safer than tracking ids. */
export async function resetDb() {
  // References both Sale (optional) and Warehouse (required) — must go
  // before either is deleted below.
  await prisma.paymentIntent.deleteMany();
  await prisma.saleRefundItem.deleteMany();
  await prisma.saleRefund.deleteMany();
  await prisma.saleItemTopping.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.productStock.deleteMany();
  await prisma.productTopping.deleteMany();
  await prisma.topping.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.media.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.userWarehouse.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();
  await prisma.promotion.deleteMany();
  // AppSettings is a singleton config row (id "singleton"), not
  // per-test fixture data — deliberately not wiped here, unlike
  // everything else in this function.

  // Shop must go last — every table above (role, warehouse, product,
  // product_type, category, unit, promotion, topping, user) carries a
  // shop_id FK to it.
  await prisma.shop.deleteMany();
}
