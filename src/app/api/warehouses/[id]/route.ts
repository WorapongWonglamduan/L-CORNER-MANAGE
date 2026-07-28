import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/warehouses/[id] - ดึงข้อมูลคลังสินค้าตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const warehouse = await prisma.warehouse.findUnique({ where: { id } });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse" },
      { status: 500 },
    );
  }
}

// PUT /api/warehouses/[id] - อัพเดทคลังสินค้า
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const {
      code,
      name_i18n,
      address,
      latitude,
      longitude,
      promptpay_id,
      is_active,
      is_default,
    } = body;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    if (code && code !== existing.code) {
      const codeExists = await prisma.warehouse.findUnique({
        where: { code },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: "Warehouse code already exists" },
          { status: 400 },
        );
      }
    }

    const warehouse = await prisma.$transaction(async (tx) => {
      if (is_default === true) {
        await tx.warehouse.updateMany({
          where: { is_default: true, id: { not: id } },
          data: { is_default: false },
        });
      }
      return tx.warehouse.update({
        where: { id },
        data: {
          code: code ?? existing.code,
          name_i18n: name_i18n ?? existing.name_i18n,
          address: address !== undefined ? address : existing.address,
          latitude: latitude !== undefined ? latitude : existing.latitude,
          longitude: longitude !== undefined ? longitude : existing.longitude,
          promptpay_id:
            promptpay_id !== undefined ? promptpay_id : existing.promptpay_id,
          is_active: is_active !== undefined ? is_active : existing.is_active,
          is_default:
            is_default !== undefined ? is_default : existing.is_default,
        },
      });
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse" },
      { status: 500 },
    );
  }
}

// DELETE /api/warehouses/[id] - ปิดใช้งานคลังสินค้า (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    await prisma.warehouse.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ message: "Warehouse deactivated successfully" });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 },
    );
  }
}
