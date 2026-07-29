import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/promotions/[id] - ดึงข้อมูลโปรโมชั่นตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { id } = await params;

    const promotion = await prisma.promotion.findUnique({ where: { id } });

    if (!promotion) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    return NextResponse.json(promotion);
  } catch (error) {
    console.error("Error fetching promotion:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion" },
      { status: 500 },
    );
  }
}

// PUT /api/promotions/[id] - อัพเดทโปรโมชั่น
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
      discount_type,
      discount_value,
      max_uses,
      expires_at,
      is_active,
    } = body;

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    if (code && code.toUpperCase() !== existing.code) {
      const codeExists = await prisma.promotion.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: "Promotion code already exists" },
          { status: 400 },
        );
      }
    }

    if (discount_type !== undefined && discount_type !== "percentage" && discount_type !== "fixed") {
      return NextResponse.json(
        { error: 'discount_type must be "percentage" or "fixed"' },
        { status: 400 },
      );
    }

    const effectiveType = discount_type ?? existing.discount_type;
    const effectiveValue = Number(discount_value ?? existing.discount_value);
    if (effectiveType === "percentage" && (effectiveValue <= 0 || effectiveValue > 100)) {
      return NextResponse.json(
        { error: "Percentage discount must be between 0 and 100" },
        { status: 400 },
      );
    }
    // The lower bound existed on create but was missing here — an existing
    // valid promotion could be PUT to a negative discount_value, which
    // sales/route.ts's Math.min only clamps from above, so it increases
    // the sale's total instead of discounting it.
    if (effectiveType === "fixed" && effectiveValue <= 0) {
      return NextResponse.json(
        { error: "Fixed discount must be greater than 0" },
        { status: 400 },
      );
    }
    if (max_uses !== undefined && max_uses !== null && Number(max_uses) < 0) {
      return NextResponse.json({ error: "max_uses cannot be negative" }, { status: 400 });
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase() : existing.code,
        name_i18n: name_i18n ?? existing.name_i18n,
        discount_type: discount_type ?? existing.discount_type,
        discount_value: discount_value ?? existing.discount_value,
        // `|| null` would coerce max_uses: 0 into "unlimited" (null).
        max_uses:
          max_uses !== undefined
            ? max_uses === null
              ? null
              : Number(max_uses)
            : existing.max_uses,
        expires_at:
          expires_at !== undefined
            ? expires_at
              ? new Date(expires_at)
              : null
            : existing.expires_at,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });

    return NextResponse.json(promotion);
  } catch (error) {
    console.error("Error updating promotion:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 },
    );
  }
}

// DELETE /api/promotions/[id] - ปิดใช้งานโปรโมชั่น (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    await prisma.promotion.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ message: "Promotion deactivated successfully" });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 },
    );
  }
}
