import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// GET /api/units - ดึงรายการหน่วยทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    // Build where clause
    const where: Record<string, unknown> = { shop_id: session!.user.shop_id! };

    if (isActive !== null) {
      where.is_active = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
        { abbreviation_i18n: { path: ["th"], string_contains: search } },
        { abbreviation_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.unit.count({ where });

    // Get paginated data
    const units = await prisma.unit.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: units,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}

// POST /api/units - สร้างหน่วยใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;
    const shopId = session!.user.shop_id!;

    const body = await request.json();
    const { name_i18n, abbreviation_i18n, unit_type, is_base_unit, is_active } = body;

    // Validation
    if (!name_i18n || !abbreviation_i18n) {
      return NextResponse.json(
        { error: "name_i18n and abbreviation_i18n are required" },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        shop_id: shopId,
        name_i18n,
        abbreviation_i18n,
        unit_type: unit_type || null,
        is_base_unit: is_base_unit ?? false,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error("Error creating unit:", error);
    return NextResponse.json(
      { error: "Failed to create unit" },
      { status: 500 }
    );
  }
}
