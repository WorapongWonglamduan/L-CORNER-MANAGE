-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_transaction_date_idx" ON "stock_movements"("transaction_date");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");
