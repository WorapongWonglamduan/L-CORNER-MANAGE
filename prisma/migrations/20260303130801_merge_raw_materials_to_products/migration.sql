/*
  Warnings:

  - You are about to drop the `raw_materials` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "raw_materials" DROP CONSTRAINT "raw_materials_type_id_fkey";

-- DropForeignKey
ALTER TABLE "raw_materials" DROP CONSTRAINT "raw_materials_unit_id_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cost_price" DECIMAL(15,2),
ADD COLUMN     "current_stock" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "selling_price" DECIMAL(15,2);

-- DropTable
DROP TABLE "raw_materials";

-- CreateIndex
CREATE INDEX "products_product_type_id_idx" ON "products"("product_type_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");
