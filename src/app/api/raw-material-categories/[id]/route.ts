import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/raw-material-categories/[id] - ดึงข้อมูลหมวดหมู่วัตถุดิบตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.rawMaterialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { raw_materials: true },
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
    console.error("Error fetching raw material category:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw material category" },
      { status: 500 }
    );
  }
}

// PUT /api/raw-material-categories/[id] - อัพเดทข้อมูลหมวดหมู่วัตถุดิบ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name_i18n, type, sort_order, is_active } = body;

    // Check if category exists
    const existing = await prisma.rawMaterialCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !["raw_material", "product"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'raw_material' or 'product'" },
        { status: 400 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (code && code !== existing.code) {
      const codeExists = await prisma.rawMaterialCategory.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Category code already exists" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.rawMaterialCategory.update({
      where: { id },
      data: {
        code: code || existing.code,
        name_i18n: name_i18n || existing.name_i18n,
        type: type || existing.type,
        sort_order: sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating raw material category:", error);
    return NextResponse.json(
      { error: "Failed to update raw material category" },
      { status: 500 }
    );
  }
}

// DELETE /api/raw-material-categories/[id] - ลบหมวดหมู่วัตถุดิบ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if category exists
    const category = await prisma.rawMaterialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { raw_materials: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has raw materials
    if (category._count.raw_materials > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with existing raw materials" },
        { status: 400 }
      );
    }

    await prisma.rawMaterialCategory.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting raw material category:", error);
    return NextResponse.json(
      { error: "Failed to delete raw material category" },
      { status: 500 }
    );
  }
}
