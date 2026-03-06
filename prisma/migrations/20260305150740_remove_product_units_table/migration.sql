/*
  Warnings:

  - You are about to drop the column `product_unit_id` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the `product_units` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_units" DROP CONSTRAINT "product_units_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_units" DROP CONSTRAINT "product_units_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_product_unit_id_fkey";

-- AlterTable
ALTER TABLE "sale_items" DROP COLUMN "product_unit_id";

-- DropTable
DROP TABLE "product_units";
