-- DropIndex
DROP INDEX "product_types_code_key";

-- DropIndex
DROP INDEX "product_types_shop_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "product_types_shop_id_code_key" ON "product_types"("shop_id", "code");
