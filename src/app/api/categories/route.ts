import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

// GET /api/categories - ดึงรายการหมวดหมู่ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    console.log("[API] Fetching categories...");

    const session = await auth();
    console.log(
      "[API] Auth check:",
      session ? "Authenticated" : "Not authenticated",
    );

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const searchQuery = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    console.log("[API] Query params:", {
      page,
      pageSize,
      searchQuery,
      isActive,
    });

    // Build where clause
    const where: Prisma.CategoryWhereInput = {};

    // Note: Cannot search by name_i18n directly with JSON field
    // Search functionality would need to be implemented differently

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    console.log("[API] Where clause:", JSON.stringify(where));
    console.log("[API] Executing Prisma count query...");

    // Get total count
    const total = await prisma.category.count({ where });
    console.log("[API] Total count:", total);

    console.log("[API] Executing Prisma findMany query...");
    // Get paginated data
    const categories = await prisma.category.findMany({
      where,
      orderBy: { sort_order: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    console.log("[API] Found categories:", categories.length);

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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name_i18n, parent_id, sort_order, is_active } = body;

    // Validation
    if (!name_i18n) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: {
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
