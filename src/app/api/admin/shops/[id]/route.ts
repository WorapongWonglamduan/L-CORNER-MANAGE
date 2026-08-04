import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireSuperAdmin } from "@/lib/permissions";

// GET /api/admin/shops/[id] - super admin only
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requireSuperAdmin(session);
    if (denied) return denied;

    const { id } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, warehouses: true, products: true } },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json(shop);
  } catch (error) {
    console.error("Error fetching shop:", error);
    return NextResponse.json({ error: "Failed to fetch shop" }, { status: 500 });
  }
}

// PUT /api/admin/shops/[id] - rename/(de)activate a shop. Super admin only.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requireSuperAdmin(session);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.shop.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name_th, name_en, is_active, logo_path } = body;
    const existingName = existing.name_i18n as { th?: string; en?: string };

    const shop = await prisma.shop.update({
      where: { id },
      data: {
        name_i18n: {
          th: name_th ?? existingName?.th ?? "",
          en: name_en ?? existingName?.en ?? "",
        },
        is_active: is_active !== undefined ? is_active : existing.is_active,
        logo_path: logo_path !== undefined ? logo_path || null : existing.logo_path,
      },
    });

    return NextResponse.json(shop);
  } catch (error) {
    console.error("Error updating shop:", error);
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
}

// DELETE /api/admin/shops/[id] - only allowed while the shop is still empty
// (no users/warehouses/products) — a populated shop has too much data
// hanging off it to delete safely from this UI; deactivate it via PUT
// instead. Super admin only.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requireSuperAdmin(session);
    if (denied) return denied;

    const { id } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, warehouses: true, products: true } },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (shop._count.users > 0 || shop._count.warehouses > 0 || shop._count.products > 0) {
      return NextResponse.json(
        { error: "Cannot delete a shop that already has users, branches, or products — deactivate it instead" },
        { status: 400 },
      );
    }

    await prisma.shop.delete({ where: { id } });

    return NextResponse.json({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop:", error);
    return NextResponse.json({ error: "Failed to delete shop" }, { status: 500 });
  }
}
