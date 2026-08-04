import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

// GET /api/categories - ดึงรายการหมวดหมู่ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const searchQuery = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    // Build where clause
    const where: Prisma.CategoryWhereInput = { shop_id: session!.user.shop_id! };

    // Note: Cannot search by name_i18n directly with JSON field
    // Search functionality would need to be implemented differently

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    // Get total count
    const total = await prisma.category.count({ where });

    // Get paginated data
    const categories = await prisma.category.findMany({
      where,
      orderBy: { sort_order: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: categories,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST /api/categories - สร้างหมวดหมู่ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;
    const shopId = session!.user.shop_id!;

    const body = await request.json();
    const { name_i18n, parent_id, sort_order, is_active } = body;

    // Validation
    if (!name_i18n) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (parent_id) {
      const parentExists = await prisma.category.findUnique({
        where: { id: parent_id, shop_id: shopId },
      });
      if (!parentExists) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
      }
    }

    const category = await prisma.category.create({
      data: {
        shop_id: shopId,
        name_i18n,
        parent_id: parent_id || null,
        sort_order: sort_order ? parseInt(sort_order) : 0,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
