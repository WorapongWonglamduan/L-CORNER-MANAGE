-- AlterTable: Make product_unit_id nullable
ALTER TABLE "sale_items" ALTER COLUMN "product_unit_id" DROP NOT NULL;
