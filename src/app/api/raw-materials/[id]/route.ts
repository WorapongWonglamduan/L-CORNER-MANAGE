import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/raw-materials/[id] - ดึงข้อมูลวัตถุดิบตาม ID (จาก products table)
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        base_unit: true,
        product_type: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Transform to match old raw_materials format
    const rawMaterial = {
      id: product.id,
      code: product.code,
      name_i18n: product.name_i18n,
      description_i18n: product.description_i18n,
      type_id: product.product_type_id,
      unit_id: product.base_unit_id,
      cost_price: product.cost_price,
      min_stock: product.min_stock_level,
      current_stock: product.current_stock,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      unit: product.base_unit,
      type: product.product_type,
    };

    return NextResponse.json(rawMaterial);
  } catch (error) {
    console.error("Error fetching raw material:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw material" },
      { status: 500 }
    );
  }
}

// PUT /api/raw-materials/[id] - อัพเดทข้อมูลวัตถุดิบ (ใน products table)
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
    const {
      code,
      name_i18n,
      description_i18n,
      type_id,
      unit_id,
      cost_price,
      min_stock,
      current_stock,
      is_active,
    } = body;

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (code && code !== existing.code) {
      const codeExists = await prisma.product.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Product code already exists" },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        code: code || existing.code,
        name_i18n: name_i18n || existing.name_i18n,
        description_i18n: description_i18n !== undefined ? description_i18n : existing.description_i18n,
        product_type_id: type_id !== undefined ? type_id : existing.product_type_id,
        base_unit_id: unit_id || existing.base_unit_id,
        cost_price: cost_price !== undefined ? cost_price : existing.cost_price,
        min_stock_level: min_stock !== undefined ? min_stock : existing.min_stock_level,
        current_stock: current_stock !== undefined ? current_stock : existing.current_stock,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
      include: {
        base_unit: true,
        product_type: true,
      },
    });

    // Transform to match old raw_materials format
    const rawMaterial = {
      id: product.id,
      code: product.code,
      name_i18n: product.name_i18n,
      description_i18n: product.description_i18n,
      type_id: product.product_type_id,
      unit_id: product.base_unit_id,
      cost_price: product.cost_price,
      min_stock: product.min_stock_level,
      current_stock: product.current_stock,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      unit: product.base_unit,
      type: product.product_type,
    };

    return NextResponse.json(rawMaterial);
  } catch (error) {
    console.error("Error updating raw material:", error);
    return NextResponse.json(
      { error: "Failed to update raw material" },
      { status: 500 }
    );
  }
}

// DELETE /api/raw-materials/[id] - ลบวัตถุดิบ (soft delete)
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

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });

    return NextResponse.json({ message: "Raw material deleted successfully" });
  } catch (error) {
    console.error("Error deleting raw material:", error);
    return NextResponse.json(
      { error: "Failed to delete raw material" },
      { status: 500 }
    );
  }
}
