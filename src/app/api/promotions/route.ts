import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/promotions - ดึงรายการโปรโมชั่นทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (isActive !== null) {
      where.is_active = isActive === "true";
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    const total = await prisma.promotion.count({ where });

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: promotions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 },
    );
  }
}

// POST /api/promotions - สร้างโปรโมชั่นใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

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

    if (!code || !name_i18n || !discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: "code, name_i18n, discount_type, and discount_value are required" },
        { status: 400 },
      );
    }

    if (discount_type !== "percentage" && discount_type !== "fixed") {
      return NextResponse.json(
        { error: 'discount_type must be "percentage" or "fixed"' },
        { status: 400 },
      );
    }

    if (discount_type === "percentage" && (discount_value <= 0 || discount_value > 100)) {
      return NextResponse.json(
        { error: "Percentage discount must be between 0 and 100" },
        { status: 400 },
      );
    }
    // Fixed discounts had no bound at all — a negative discount_value here
    // flows straight into sales/route.ts's Math.min(discount_value,
    // subtotal), which only clamps the *upper* bound, so a negative value
    // increases the sale's total instead of discounting it.
    if (discount_type === "fixed" && Number(discount_value) <= 0) {
      return NextResponse.json(
        { error: "Fixed discount must be greater than 0" },
        { status: 400 },
      );
    }
    if (max_uses !== undefined && max_uses !== null && Number(max_uses) < 0) {
      return NextResponse.json({ error: "max_uses cannot be negative" }, { status: 400 });
    }

    const existing = await prisma.promotion.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Promotion code already exists" },
        { status: 400 },
      );
    }

    const promotion = await prisma.promotion.create({
      data: {
        code: code.toUpperCase(),
        name_i18n,
        discount_type,
        discount_value,
        // `|| null` would coerce max_uses: 0 into "unlimited" (null) — the
        // opposite of what setting it to 0 clearly means (no uses left).
        max_uses: max_uses === undefined || max_uses === null ? null : Number(max_uses),
        expires_at: expires_at ? new Date(expires_at) : null,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 },
    );
  }
}
