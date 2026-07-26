import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/units/[id] - ดึงข้อมูลหน่วยตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { id } = await params;

    const unit = await prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json(
      { error: "Failed to fetch unit" },
      { status: 500 }
    );
  }
}

// PUT /api/units/[id] - อัปเดตข้อมูลหน่วย
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
    const { name_i18n, abbreviation_i18n, unit_type, is_base_unit, is_active } = body;

    // Check if unit exists
    const existingUnit = await prisma.unit.findUnique({
      where: { id },
    });

    if (!existingUnit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name_i18n: name_i18n ?? existingUnit.name_i18n,
        abbreviation_i18n: abbreviation_i18n ?? existingUnit.abbreviation_i18n,
        unit_type: unit_type !== undefined ? unit_type : existingUnit.unit_type,
        is_base_unit: is_base_unit ?? existingUnit.is_base_unit,
        is_active: is_active ?? existingUnit.is_active,
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json(
      { error: "Failed to update unit" },
      { status: 500 }
    );
  }
}

// DELETE /api/units/[id] - ลบหน่วย
// Query params: ?hard=true สำหรับ hard delete, ไม่ระบุหรือ false จะเป็น soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    // Check if unit exists
    const existingUnit = await prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products_as_base: true,
            recipe_ingredients: true,
          },
        },
      },
    });

    if (!existingUnit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Hard delete - check for relations first
    if (hardDelete) {
      const hasRelations =
        existingUnit._count.products_as_base > 0 ||
        existingUnit._count.recipe_ingredients > 0;

      if (hasRelations) {
        const errors = [];
        if (existingUnit._count.products_as_base > 0) {
          errors.push(`${existingUnit._count.products_as_base} products (as base unit)`);
        }
        if (existingUnit._count.recipe_ingredients > 0) {
          errors.push(`${existingUnit._count.recipe_ingredients} recipe ingredients`);
        }

        return NextResponse.json(
          {
            error: `Cannot delete unit with existing: ${errors.join(", ")}`,
            details: {
              products_as_base: existingUnit._count.products_as_base,
              recipe_ingredients: existingUnit._count.recipe_ingredients,
            },
          },
          { status: 400 }
        );
      }

      // Perform hard delete
      await prisma.unit.delete({
        where: { id },
      });

      return NextResponse.json({ 
        message: "Unit permanently deleted successfully",
        deleted: true,
      });
    }

    // Soft delete (default)
    const unit = await prisma.unit.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ 
      message: "Unit deactivated successfully", 
      unit,
      deleted: false,
    });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json(
      { error: "Failed to delete unit" },
      { status: 500 }
    );
  }
}
