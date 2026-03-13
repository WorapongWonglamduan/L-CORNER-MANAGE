import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      product_id, 
      adjustment_type,  // "in", "out", "adjustment" (legacy support)
      quantity, 
      reason, 
      note,
      reason_code,
      reference_type,
      reference_id
    } = body;

    if (!product_id || !adjustment_type || !quantity || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get current product stock
    const product = await prisma.product.findUnique({
      where: { id: product_id },
      select: { current_stock: true, code: true, name_i18n: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Calculate new stock and determine direction
    let newStock: number;
    let direction: string;
    let quantityChange: number;
    const currentStock = Number(product.current_stock);
    const adjustmentQty = Number(quantity);

    if (adjustment_type === "in") {
      newStock = currentStock + adjustmentQty;
      direction = "in";
      quantityChange = adjustmentQty;
    } else if (adjustment_type === "out") {
      newStock = currentStock - adjustmentQty;
      direction = "out";
      quantityChange = adjustmentQty;
    } else if (adjustment_type === "adjustment") {
      // Direct stock count/adjustment
      newStock = adjustmentQty;
      direction = adjustmentQty > currentStock ? "in" : "out";
      quantityChange = Math.abs(adjustmentQty - currentStock);
    } else {
      return NextResponse.json(
        { error: "Invalid adjustment type" },
        { status: 400 }
      );
    }

    // Validate new stock
    if (newStock < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      );
    }

    // Create stock movement record and update product stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create stock movement record
      const stockMovement = await tx.stockMovement.create({
        data: {
          product_id,
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
          created_by: session.user?.id || "",
          transaction_date: new Date(),
        },
      });

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: product_id },
        data: { current_stock: newStock },
      });

      return { stockMovement, updatedProduct };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Stock adjusted successfully",
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
