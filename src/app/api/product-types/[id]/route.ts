import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/product-types/[id] - ดึงข้อมูลประเภทสินค้าตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { id } = await params;

    const productType = await prisma.productType.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!productType) {
      return NextResponse.json(
        { error: "Product type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(productType);
  } catch (error) {
    console.error("Error fetching product type:", error);
    return NextResponse.json(
      { error: "Failed to fetch product type" },
      { status: 500 }
    );
  }
}

// PUT/DELETE /api/product-types/[id] - ปิดการแก้ไข/ลบประเภทสินค้า
//
// See POST's comment in ../route.ts: the 4 product types are provisioned
// once per shop and never change. Editing `type` on a row already in use
// would silently change recipe/stock behavior for its existing products;
// deleting one (even an unused row) would put the shop back in the
// "can't create a product" state this was fixed for. Read-only by design.
export async function PUT() {
  return NextResponse.json(
    { error: "Product types are managed by the system and cannot be edited" },
    { status: 403 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Product types are managed by the system and cannot be deleted" },
    { status: 403 },
  );
}
