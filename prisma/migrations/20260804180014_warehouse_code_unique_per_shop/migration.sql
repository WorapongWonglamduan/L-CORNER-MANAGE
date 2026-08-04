-- DropIndex
DROP INDEX "warehouses_code_key";

-- DropIndex
DROP INDEX "warehouses_shop_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_shop_id_code_key" ON "warehouses"("shop_id", "code");
