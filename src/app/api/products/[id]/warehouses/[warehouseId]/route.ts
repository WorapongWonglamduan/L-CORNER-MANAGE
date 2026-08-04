import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, assertWarehouseAccessLive } from "@/lib/permissions";

// PATCH /api/products/[id]/warehouses/[warehouseId] - ซ่อน/แสดงสินค้าในคลังนี้
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; warehouseId: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.adjust");
    if (denied) return denied;

    const { id: product_id, warehouseId: warehouse_id } = await params;

    const deniedWarehouse = await assertWarehouseAccessLive(session, warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

    // Verify the product belongs to the caller's shop before letting them
    // toggle its visibility at this warehouse.
    const product = await prisma.product.findFirst({
      where: { id: product_id, shop_id: session!.user.shop_id! },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean" },
        { status: 400 },
      );
    }

    const productStock = await prisma.productStock.findUnique({
      where: { product_id_warehouse_id: { product_id, warehouse_id } },
    });

    if (is_active === false) {
      const currentStock = Number(productStock?.current_stock) || 0;
      if (currentStock !== 0) {
        return NextResponse.json(
          { error: "Cannot hide a product with stock remaining at this warehouse" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.productStock.upsert({
      where: { product_id_warehouse_id: { product_id, warehouse_id } },
      create: { product_id, warehouse_id, current_stock: 0, is_active },
      update: { is_active },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating product warehouse visibility:", error);
    return NextResponse.json(
      { error: "Failed to update product warehouse visibility" },
      { status: 500 },
    );
  }
}
