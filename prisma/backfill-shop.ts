// One-off backfill: creates a single "L-Corner" Shop and points every
// currently-unscoped row (Warehouse, Category, Product, ProductType, Unit,
// Promotion, Topping, Role, User) at it, since every row in the DB today
// belongs to that one shop. Run once, after the pass-1 `prisma db push`
// (nullable shop_id columns) and before the pass-2 push (required columns).
// Usage: npx tsx prisma/backfill-shop.ts
//
// Already run against the local/L-Corner DB — kept as a record of the
// migration. The `shop_id: null` filters below only type-check against the
// pass-1 (nullable) schema, so they're cast to `any`; re-running this after
// pass 2 is a no-op (no row has a null shop_id anymore) and only User's
// column is legitimately nullable post-migration.
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const DEFAULT_THEME = {
  theme_color: "#213559",
  theme_color_light: "#2c4a7a",
  theme_color_dark: "#1a2844",
};

async function main() {
  console.log("🌱 Backfilling L-Corner shop...");

  const shop = await prisma.shop.create({
    data: {
      name_i18n: { th: "แอล คอร์เนอร์", en: "L-Corner" },
      is_active: true,
    },
  });
  console.log(`✅ Created shop "${shop.id}"`);

  const nullShopId = { shop_id: null } as any;
  const results = await Promise.all([
    prisma.warehouse.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.category.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.product.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.productType.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.unit.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.promotion.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.topping.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.role.updateMany({ where: nullShopId, data: { shop_id: shop.id } }),
    prisma.user.updateMany({ where: { shop_id: null }, data: { shop_id: shop.id } }),
  ]);
  const [warehouses, categories, products, productTypes, units, promotions, toppings, roles, users] = results;
  console.log(`✅ Backfilled shop_id: ${warehouses.count} warehouses, ${categories.count} categories, ${products.count} products, ${productTypes.count} product types, ${units.count} units, ${promotions.count} promotions, ${toppings.count} toppings, ${roles.count} roles, ${users.count} users`);

  const admin = await prisma.user.updateMany({
    where: { email: "admin@lcorner.local" },
    data: { is_super_admin: true },
  });
  console.log(`✅ Marked admin@lcorner.local as super admin (${admin.count} row updated) — it keeps shop_id pointing at L-Corner too`);

  await prisma.appSettings.upsert({
    where: { shop_id: shop.id },
    update: {},
    create: { shop_id: shop.id, ...DEFAULT_THEME },
  });
  console.log("✅ Recreated app_settings row for L-Corner");

  console.log("🎉 Backfill complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
