import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/raw-materials/[id] - ดึงข้อมูลวัตถุดิบตาม ID
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

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        unit: true,
        type: true,
      },
    });

    if (!rawMaterial) {
      return NextResponse.json(
        { error: "Raw material not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rawMaterial);
  } catch (error) {
    console.error("Error fetching raw material:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw material" },
      { status: 500 }
    );
  }
}

// PUT /api/raw-materials/[id] - อัพเดทข้อมูลวัตถุดิบ
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

    // Check if raw material exists
    const existing = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Raw material not found" },
        { status: 404 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (code && code !== existing.code) {
      const codeExists = await prisma.rawMaterial.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Raw material code already exists" },
          { status: 400 }
        );
      }
    }

    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        code: code || existing.code,
        name_i18n: name_i18n || existing.name_i18n,
        description_i18n: description_i18n !== undefined ? description_i18n : existing.description_i18n,
        type_id: type_id !== undefined ? type_id : existing.type_id,
        unit_id: unit_id || existing.unit_id,
        cost_price: cost_price !== undefined ? cost_price : existing.cost_price,
        min_stock: min_stock !== undefined ? min_stock : existing.min_stock,
        current_stock: current_stock !== undefined ? current_stock : existing.current_stock,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
      include: {
        unit: true,
        type: true,
      },
    });

    return NextResponse.json(rawMaterial);
  } catch (error) {
    console.error("Error updating raw material:", error);
    return NextResponse.json(
      { error: "Failed to update raw material" },
      { status: 500 }
    );
  }
}

// DELETE /api/raw-materials/[id] - ลบวัตถุดิบ
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

    // Check if raw material exists
    const existing = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Raw material not found" },
        { status: 404 }
      );
    }

    await prisma.rawMaterial.delete({
      where: { id },
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
