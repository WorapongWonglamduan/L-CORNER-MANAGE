/*
  Warnings:

  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `languages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_toppings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `purchase_order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `purchase_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sale_item_toppings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stock_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stock_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `toppings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `unit_conversions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_toppings" DROP CONSTRAINT "product_toppings_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_toppings" DROP CONSTRAINT "product_toppings_topping_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_po_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_product_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_created_by_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_item_toppings" DROP CONSTRAINT "sale_item_toppings_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_item_toppings" DROP CONSTRAINT "sale_item_toppings_sale_item_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_item_toppings" DROP CONSTRAINT "sale_item_toppings_topping_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_product_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_alerts" DROP CONSTRAINT "stock_alerts_product_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_alerts" DROP CONSTRAINT "stock_alerts_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_transactions" DROP CONSTRAINT "stock_transactions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "stock_transactions" DROP CONSTRAINT "stock_transactions_product_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_transactions" DROP CONSTRAINT "stock_transactions_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_transactions" DROP CONSTRAINT "stock_transactions_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_product_id_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "toppings" DROP CONSTRAINT "toppings_category_id_fkey";

-- DropForeignKey
ALTER TABLE "toppings" DROP CONSTRAINT "toppings_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "toppings" DROP CONSTRAINT "toppings_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "unit_conversions" DROP CONSTRAINT "unit_conversions_from_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "unit_conversions" DROP CONSTRAINT "unit_conversions_to_unit_id_fkey";

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "tax_rate" SET DEFAULT 0;

-- DropTable
DROP TABLE "customers";

-- DropTable
DROP TABLE "languages";

-- DropTable
DROP TABLE "product_toppings";

-- DropTable
DROP TABLE "purchase_order_items";

-- DropTable
DROP TABLE "purchase_orders";

-- DropTable
DROP TABLE "sale_item_toppings";

-- DropTable
DROP TABLE "stock_alerts";

-- DropTable
DROP TABLE "stock_transactions";

-- DropTable
DROP TABLE "stocks";

-- DropTable
DROP TABLE "suppliers";

-- DropTable
DROP TABLE "toppings";

-- DropTable
DROP TABLE "unit_conversions";

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_unit_id_fkey" FOREIGN KEY ("product_unit_id") REFERENCES "product_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
