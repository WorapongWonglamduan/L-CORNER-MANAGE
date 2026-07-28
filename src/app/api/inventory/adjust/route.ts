import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, assertWarehouseAccessLive } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.adjust");
    if (denied) return denied;

    const body = await request.json();
    const {
      product_id,
      warehouse_id,
      adjustment_type,  // "in", "out", "adjustment" (legacy support)
      quantity,
      reason,
      note,
      reason_code,
      reference_type,
      reference_id
    } = body;

    if (!product_id || !warehouse_id || !adjustment_type || !quantity || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const deniedWarehouse = await assertWarehouseAccessLive(session, warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

    // Get current product stock at this warehouse
    const product = await prisma.product.findUnique({
      where: { id: product_id },
      select: { code: true, name_i18n: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const adjustmentQty = Number(quantity);

    if (
      adjustment_type !== "in" &&
      adjustment_type !== "out" &&
      adjustment_type !== "adjustment"
    ) {
      return NextResponse.json(
        { error: "Invalid adjustment type" },
        { status: 400 }
      );
    }

    // Create stock movement record and update product stock in a transaction.
    // "in"/"out" use an atomic increment/decrement (a single UPDATE ...
    // [WHERE current_stock >= amount] statement) instead of read-then-write,
    // so two concurrent adjustments on the same row can't both read the same
    // snapshot and silently lose one of the changes (or, for "out", both
    // pass a negative-stock check that's already stale by the time either
    // writes). "adjustment" sets an absolute count, so it has no such race
    // to guard against — last write wins by design.
    const result = await prisma.$transaction(async (tx) => {
      const ensured = await tx.productStock.upsert({
        where: { product_id_warehouse_id: { product_id, warehouse_id } },
        create: { product_id, warehouse_id, current_stock: 0 },
        update: {},
      });
      const currentStock = Number(ensured.current_stock);

      let updatedProductStock;
      let direction: string;
      let quantityChange: number;
      let newStock: number;

      if (adjustment_type === "in") {
        direction = "in";
        quantityChange = adjustmentQty;
        updatedProductStock = await tx.productStock.update({
          where: { product_id_warehouse_id: { product_id, warehouse_id } },
          data: { current_stock: { increment: adjustmentQty } },
        });
        newStock = Number(updatedProductStock.current_stock);
      } else if (adjustment_type === "out") {
        direction = "out";
        quantityChange = adjustmentQty;
        const decremented = await tx.productStock.updateMany({
          where: {
            product_id,
            warehouse_id,
            current_stock: { gte: adjustmentQty },
          },
          data: { current_stock: { decrement: adjustmentQty } },
        });
        if (decremented.count === 0) {
          throw new Error("INSUFFICIENT_STOCK");
        }
        updatedProductStock = await tx.productStock.findUniqueOrThrow({
          where: { product_id_warehouse_id: { product_id, warehouse_id } },
        });
        newStock = Number(updatedProductStock.current_stock);
      } else {
        // "adjustment" — direct stock count, an absolute value.
        newStock = adjustmentQty;
        direction = adjustmentQty > currentStock ? "in" : "out";
        quantityChange = Math.abs(adjustmentQty - currentStock);
        updatedProductStock = await tx.productStock.update({
          where: { product_id_warehouse_id: { product_id, warehouse_id } },
          data: { current_stock: newStock },
        });
      }

      const stockMovement = await tx.stockMovement.create({
        data: {
          product_id,
          warehouse_id,
          movement_type: "manual_adjustment",
          direction,
          quantity_before: currentStock,
          quantity_change: quantityChange,
          quantity_after: newStock,
          reason_code: reason_code || null,
          reason_text: reason,
          note: note || null,
          reference_type: reference_type || null,
          reference_id: reference_id || null,
          created_by: session?.user?.id || "",
          transaction_date: new Date(),
        },
      });

      return { stockMovement, updatedProductStock };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Stock adjusted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 },
      );
    }
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
