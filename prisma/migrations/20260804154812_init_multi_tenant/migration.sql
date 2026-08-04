-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'unpaid');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'expired');

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "logo_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_warehouses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "abbreviation_i18n" JSONB NOT NULL,
    "unit_type" TEXT,
    "is_base_unit" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "promptpay_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_stocks" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "current_stock" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "low_stock_threshold" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "from_warehouse_id" TEXT NOT NULL,
    "to_warehouse_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "category_id" TEXT,
    "product_type_id" TEXT NOT NULL,
    "base_unit_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_serial" BOOLEAN NOT NULL DEFAULT false,
    "has_expiry" BOOLEAN NOT NULL DEFAULT false,
    "track_stock" BOOLEAN NOT NULL DEFAULT true,
    "selling_price" DECIMAL(15,2),
    "cost_price" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "serving_qty" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "serving_unit_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_id" TEXT NOT NULL,
    "base_quantity" DECIMAL(15,4),
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "note_i18n" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toppings" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity_per_serving" DECIMAL(15,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toppings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_toppings" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "topping_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_toppings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "sale_number" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouse_id" TEXT NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "payment_method" TEXT,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'paid',
    "status" "SaleStatus" NOT NULL DEFAULT 'completed',
    "created_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotion_id" TEXT,
    "promotion_code" TEXT,
    "idempotency_key" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'pending',
    "gateway_reference" TEXT,
    "qr_image_url" TEXT,
    "qr_payload" TEXT,
    "cart_snapshot" JSONB NOT NULL,
    "sale_id" TEXT,
    "failure_reason" TEXT,
    "raw_last_webhook_payload" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "recipe_id" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "cost_price" DECIMAL(15,2),
    "base_quantity" DECIMAL(15,4),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_refunds" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "refund_number" TEXT NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_refund_items" (
    "id" TEXT NOT NULL,
    "sale_refund_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "sale_refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item_toppings" (
    "id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "topping_id" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_item_toppings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(15,2) NOT NULL,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_types" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "code" TEXT NOT NULL,
    "icon" TEXT,
    "type" TEXT NOT NULL DEFAULT 'product',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "movement_type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "quantity_before" DECIMAL(15,4) NOT NULL,
    "quantity_change" DECIMAL(15,4) NOT NULL,
    "quantity_after" DECIMAL(15,4) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "reason_code" TEXT,
    "reason_text" TEXT NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "thumbnail_path" TEXT,
    "medium_path" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "shop_id" TEXT NOT NULL,
    "theme_color" TEXT NOT NULL DEFAULT '#213559',
    "theme_color_light" TEXT NOT NULL DEFAULT '#2c4a7a',
    "theme_color_dark" TEXT NOT NULL DEFAULT '#1a2844',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("shop_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_shop_id_idx" ON "users"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_shop_id_name_key" ON "roles"("shop_id", "name");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "user_warehouses_warehouse_id_idx" ON "user_warehouses"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_warehouses_user_id_warehouse_id_key" ON "user_warehouses"("user_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "units_shop_id_idx" ON "units"("shop_id");

-- CreateIndex
CREATE INDEX "categories_shop_id_idx" ON "categories"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_shop_id_idx" ON "warehouses"("shop_id");

-- CreateIndex
CREATE INDEX "product_stocks_warehouse_id_idx" ON "product_stocks"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_stocks_product_id_warehouse_id_key" ON "product_stocks"("product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transfers_from_warehouse_id_idx" ON "stock_transfers"("from_warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transfers_to_warehouse_id_idx" ON "stock_transfers"("to_warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transfers_product_id_idx" ON "stock_transfers"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_shop_id_idx" ON "products"("shop_id");

-- CreateIndex
CREATE INDEX "products_product_type_id_idx" ON "products"("product_type_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "recipes_product_id_idx" ON "recipes"("product_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_unit_id_idx" ON "recipe_ingredients"("unit_id");

-- CreateIndex
CREATE INDEX "toppings_shop_id_idx" ON "toppings"("shop_id");

-- CreateIndex
CREATE INDEX "toppings_ingredient_id_idx" ON "toppings"("ingredient_id");

-- CreateIndex
CREATE INDEX "product_toppings_topping_id_idx" ON "product_toppings"("topping_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_toppings_product_id_topping_id_key" ON "product_toppings"("product_id", "topping_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"("sale_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_idempotency_key_key" ON "sales"("idempotency_key");

-- CreateIndex
CREATE INDEX "sales_warehouse_id_idx" ON "sales"("warehouse_id");

-- CreateIndex
CREATE INDEX "sales_created_by_idx" ON "sales"("created_by");

-- CreateIndex
CREATE INDEX "sales_promotion_id_idx" ON "sales"("promotion_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_gateway_reference_key" ON "payment_intents"("gateway_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_sale_id_key" ON "payment_intents"("sale_id");

-- CreateIndex
CREATE INDEX "payment_intents_warehouse_id_idx" ON "payment_intents"("warehouse_id");

-- CreateIndex
CREATE INDEX "payment_intents_created_by_idx" ON "payment_intents"("created_by");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "sale_items_recipe_id_idx" ON "sale_items"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_refunds_refund_number_key" ON "sale_refunds"("refund_number");

-- CreateIndex
CREATE INDEX "sale_refunds_sale_id_idx" ON "sale_refunds"("sale_id");

-- CreateIndex
CREATE INDEX "sale_refund_items_sale_refund_id_idx" ON "sale_refund_items"("sale_refund_id");

-- CreateIndex
CREATE INDEX "sale_refund_items_sale_item_id_idx" ON "sale_refund_items"("sale_item_id");

-- CreateIndex
CREATE INDEX "sale_item_toppings_sale_item_id_idx" ON "sale_item_toppings"("sale_item_id");

-- CreateIndex
CREATE INDEX "sale_item_toppings_topping_id_idx" ON "sale_item_toppings"("topping_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_shop_id_idx" ON "promotions"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_types_code_key" ON "product_types"("code");

-- CreateIndex
CREATE INDEX "product_types_shop_id_idx" ON "product_types"("shop_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_warehouse_id_idx" ON "stock_movements"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_transaction_date_idx" ON "stock_movements"("transaction_date");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_stored_filename_key" ON "media"("stored_filename");

-- CreateIndex
CREATE INDEX "media_entity_type_entity_id_idx" ON "media"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at");

-- CreateIndex
CREATE INDEX "product_media_product_id_is_primary_idx" ON "product_media"("product_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_product_id_media_id_key" ON "product_media"("product_id", "media_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warehouses" ADD CONSTRAINT "user_warehouses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warehouses" ADD CONSTRAINT "user_warehouses_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_serving_unit_id_fkey" FOREIGN KEY ("serving_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toppings" ADD CONSTRAINT "toppings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toppings" ADD CONSTRAINT "toppings_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_toppings" ADD CONSTRAINT "product_toppings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_toppings" ADD CONSTRAINT "product_toppings_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "toppings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_refunds" ADD CONSTRAINT "sale_refunds_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_refunds" ADD CONSTRAINT "sale_refunds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_refund_items" ADD CONSTRAINT "sale_refund_items_sale_refund_id_fkey" FOREIGN KEY ("sale_refund_id") REFERENCES "sale_refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_refund_items" ADD CONSTRAINT "sale_refund_items_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item_toppings" ADD CONSTRAINT "sale_item_toppings_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item_toppings" ADD CONSTRAINT "sale_item_toppings_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "toppings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: only one default warehouse per shop. Not
-- expressible in Prisma's schema DSL (no support for a WHERE clause on
-- @@unique/@@index), so it's hand-added here.
CREATE UNIQUE INDEX warehouses_is_default_true_idx ON warehouses (shop_id) WHERE (is_default = true);
