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

    // Defense-in-depth alongside assertWarehouseAccessLive above: confirm
    // the warehouse being adjusted actually belongs to the caller's own
    // shop, not just that the caller has a UserWarehouse grant for it.
    const warehouseInShop = await prisma.warehouse.findFirst({
      where: { id: warehouse_id, shop_id: session!.user.shop_id! },
      select: { id: true },
    });
    if (!warehouseInShop) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

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

    // `!quantity` above only rejects zero/falsy — a negative number is
    // truthy in JS and would otherwise sail through. For "in"/"out" the
    // change magnitude must be positive (direction comes from the mode,
    // not the sign); a negative "in" would silently decrement stock with
    // none of "out"'s own negative-stock guard, and a negative "out" would
    // silently increment it while being logged as a stock decrease.
    // "adjustment" sets an absolute count, so it must not be negative either
    // — a warehouse can't hold negative physical stock.
    if (adjustment_type === "adjustment" ? adjustmentQty < 0 : !(adjustmentQty > 0)) {
      return NextResponse.json(
        { error: "Quantity must be positive" },
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
    // Per the allow-list model (a product is only sellable/visible at a
    // warehouse it's been explicitly assigned to, via the create-time
    // checkbox or the "จัดการคลัง" modal — see PATCH
    // /api/products/[id]/warehouses/[warehouseId]), this must never
    // silently create a brand-new ProductStock row: that row defaults to
    // is_active:true, so an adjustment on a never-assigned product/
    // warehouse pair would grant it visibility there as a side effect of
    // recording a stock count.
    const existingStock = await prisma.productStock.findUnique({
      where: { product_id_warehouse_id: { product_id, warehouse_id } },
    });
    if (!existingStock) {
      return NextResponse.json(
        { error: "Product is not assigned to this warehouse yet" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction (not the pre-transaction
      // `existingStock` above, which only proves the row exists) — the
      // audit row's `quantity_before` must reflect what's actually true at
      // the moment of this transaction, not a snapshot from before it
      // started.
      const current = await tx.productStock.findUniqueOrThrow({
        where: { product_id_warehouse_id: { product_id, warehouse_id } },
      });
      const currentStock = Number(current.current_stock);

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
