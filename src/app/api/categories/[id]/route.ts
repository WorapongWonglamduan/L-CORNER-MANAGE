import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/categories/[id] - ดึงข้อมูลหมวดหมู่ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { id } = await params;

    const category = await prisma.category.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - อัพเดทข้อมูลหมวดหมู่
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;
    const shopId = session!.user.shop_id!;

    const { id } = await params;
    const body = await request.json();
    const { name_i18n, parent_id, sort_order, is_active } = body;

    // Check if category exists
    const existing = await prisma.category.findFirst({
      where: { id, shop_id: shopId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Reject a parent assignment that would create a cycle (self or one of
    // its own descendants), walking up the chain from the proposed parent.
    if (parent_id) {
      if (parent_id === id) {
        return NextResponse.json(
          { error: "A category cannot be its own parent" },
          { status: 400 }
        );
      }
      let ancestorId: string | null = parent_id;
      while (ancestorId) {
        if (ancestorId === id) {
          return NextResponse.json(
            { error: "Cannot assign a descendant category as the parent" },
            { status: 400 }
          );
        }
        const ancestor: { parent_id: string | null } | null =
          await prisma.category.findFirst({
            where: { id: ancestorId, shop_id: shopId },
            select: { parent_id: true },
          });
        ancestorId = ancestor?.parent_id ?? null;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name_i18n: name_i18n || existing.name_i18n,
        parent_id: parent_id !== undefined ? parent_id : existing.parent_id,
        sort_order: sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - ลบหมวดหมู่
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;

    // Check if category exists
    const category = await prisma.category.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has products
    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with existing products (${category._count.products} products)` },
        { status: 400 }
      );
    }

    // Check if category has sub-categories
    if (category._count.children > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with existing sub-categories (${category._count.children} sub-categories)` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
