-- Data backfill, not a schema change: POST /api/admin/shops (shop
-- provisioning) never seeded any ProductType, and POST /api/product-types
-- (the settings-page "add type" endpoint) silently created every type as
-- the generic "product" classification — so any shop that didn't go
-- through prisma/seed.ts's demo data ended up with zero (or incomplete)
-- ingredient/semi_finished/finished_good/container types and could not
-- create a single product (products/form/helper.tsx's type dropdown only
-- offers semi_finished/finished_good; ingredients-and-containers/toppings
-- filter by ingredient/container). Both code paths are fixed going forward
-- — this repairs shops that were already provisioned before the fix.
--
-- Idempotent: only inserts a canonical type for a shop that doesn't
-- already have one with that `type` value, so re-running this migration
-- (or applying it to an environment that's already fully seeded, like
-- prod's one shop) is a no-op.

-- Data correction: prisma/seed.ts's CONTAINER row was mis-typed
-- "ingredient" (copy-paste bug from the row above it) instead of
-- "container" — fixed in the seed script itself in the same change as
-- this migration, but any shop already provisioned from the buggy script
-- (e.g. the one seeded shop on prod/UAT) still has the bad row live. Fix
-- it in place rather than inserting a second CONTAINER row, which would
-- violate the new @@unique([shop_id, code]) constraint.
UPDATE "product_types"
SET "type" = 'container'
WHERE "code" = 'CONTAINER' AND "type" = 'ingredient';

INSERT INTO "product_types" ("id", "shop_id", "name_i18n", "code", "icon", "type", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), s."id", '{"th":"วัตถุดิบ","en":"Ingredient"}'::jsonb, 'INGREDIENT', 'package', 'ingredient', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "shops" s
WHERE NOT EXISTS (
  SELECT 1 FROM "product_types" pt WHERE pt."shop_id" = s."id" AND pt."type" = 'ingredient'
);

INSERT INTO "product_types" ("id", "shop_id", "name_i18n", "code", "icon", "type", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), s."id", '{"th":"กึ่งสำเร็จรูป","en":"Semi-Finished"}'::jsonb, 'SEMI_FINISHED', 'box', 'semi_finished', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "shops" s
WHERE NOT EXISTS (
  SELECT 1 FROM "product_types" pt WHERE pt."shop_id" = s."id" AND pt."type" = 'semi_finished'
);

INSERT INTO "product_types" ("id", "shop_id", "name_i18n", "code", "icon", "type", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), s."id", '{"th":"สินค้าสำเร็จรูป","en":"Finished Good"}'::jsonb, 'FINISHED_GOOD', 'check-circle', 'finished_good', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "shops" s
WHERE NOT EXISTS (
  SELECT 1 FROM "product_types" pt WHERE pt."shop_id" = s."id" AND pt."type" = 'finished_good'
);

INSERT INTO "product_types" ("id", "shop_id", "name_i18n", "code", "icon", "type", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), s."id", '{"th":"ภาชนะ","en":"Container"}'::jsonb, 'CONTAINER', 'cup-soda', 'container', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "shops" s
WHERE NOT EXISTS (
  SELECT 1 FROM "product_types" pt WHERE pt."shop_id" = s."id" AND pt."type" = 'container'
);
