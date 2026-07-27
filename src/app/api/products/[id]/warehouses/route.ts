import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/products/[id]/warehouses - รายการคลังที่ผู้ใช้ถูกมอบหมาย
// พร้อมสต็อกและสถานะการมองเห็น (is_active) ของสินค้านี้ในแต่ละคลัง
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { id: product_id } = await params;
    const warehouseIds = session?.user?.warehouse_ids ?? [];

    const warehouses = await prisma.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: {
        id: true,
        code: true,
        name_i18n: true,
        stock: {
          where: { product_id },
          select: { current_stock: true, is_active: true },
        },
      },
      orderBy: { code: "asc" },
    });

    const items = warehouses.map((warehouse) => {
      const stock = warehouse.stock[0];
      return {
        warehouse_id: warehouse.id,
        code: warehouse.code,
        name_i18n: warehouse.name_i18n,
        current_stock: stock ? Number(stock.current_stock) : 0,
        is_active: stock ? stock.is_active : false,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching product warehouse visibility:", error);
    return NextResponse.json(
      { error: "Failed to fetch product warehouses" },
      { status: 500 },
    );
  }
}
