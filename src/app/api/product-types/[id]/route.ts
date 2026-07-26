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

    const productType = await prisma.productType.findUnique({
      where: { id },
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

// PUT /api/product-types/[id] - อัพเดทข้อมูลประเภทสินค้า
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const { code, name_i18n, icon, type, sort_order, is_active } = body;

    // Check if product type exists
    const existing = await prisma.productType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product type not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !["raw_material", "product", "semi_finished", "finished_good"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'raw_material', 'product', 'semi_finished', or 'finished_good'" },
        { status: 400 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (code && code !== existing.code) {
      const codeExists = await prisma.productType.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Product type code already exists" },
          { status: 400 }
        );
      }
    }

    const productType = await prisma.productType.update({
      where: { id },
      data: {
        code: code || existing.code,
        name_i18n: name_i18n || existing.name_i18n,
        icon: icon !== undefined ? icon : existing.icon,
        type: type || existing.type,
        sort_order: sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });

    return NextResponse.json(productType);
  } catch (error) {
    console.error("Error updating product type:", error);
    return NextResponse.json(
      { error: "Failed to update product type" },
      { status: 500 }
    );
  }
}

// DELETE /api/product-types/[id] - ลบประเภทสินค้า
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;

    // Check if product type exists
    const productType = await prisma.productType.findUnique({
      where: { id },
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

    // Check if product type has products
    if (productType._count.products > 0) {
      return NextResponse.json(
        { error: "Cannot delete product type with existing products" },
        { status: 400 }
      );
    }

    await prisma.productType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Product type deleted successfully" });
  } catch (error) {
    console.error("Error deleting product type:", error);
    return NextResponse.json(
      { error: "Failed to delete product type" },
      { status: 500 }
    );
  }
}
