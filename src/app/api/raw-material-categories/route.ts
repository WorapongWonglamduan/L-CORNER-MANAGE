import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

// GET /api/raw-material-categories - ดึงรายการหมวดหมู่วัตถุดิบทั้งหมด
export async function GET(request: NextRequest) {
  try {
    console.log("[API] Fetching raw material categories...");

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
    const type = searchParams.get("type");

    console.log("[API] Query params:", {
      page,
      pageSize,
      searchQuery,
      isActive,
      type,
    });

    // Build where clause
    const where: Prisma.RawMaterialCategoryWhereInput = {};

    if (type && type !== null) {
      where.type = type;
    }

    if (searchQuery) {
      where.OR = [
        { code: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    console.log("[API] Where clause:", JSON.stringify(where));
    console.log("[API] Executing Prisma count query...");

    // Get total count
    const total = await prisma.rawMaterialCategory.count({ where });
    console.log("[API] Total count:", total);

    console.log("[API] Executing Prisma findMany query...");
    // Get paginated data
    const categories = await prisma.rawMaterialCategory.findMany({
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
    console.error("Error fetching raw material categories:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch raw material categories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST /api/raw-material-categories - สร้างหมวดหมู่วัตถุดิบใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, name_i18n, type, sort_order, is_active } = body;

    // Validation
    if (!code || !name_i18n || !type) {
      return NextResponse.json(
        { error: "Code, name, and type are required" },
        { status: 400 },
      );
    }

    // Validate type
    if (!["raw_material", "product"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'raw_material' or 'product'" },
        { status: 400 },
      );
    }

    // Check if code already exists
    const existing = await prisma.rawMaterialCategory.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category code already exists" },
        { status: 400 },
      );
    }

    const category = await prisma.rawMaterialCategory.create({
      data: {
        code,
        name_i18n,
        type,
        sort_order: sort_order ? parseInt(sort_order) : 0,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating raw material category:", error);
    return NextResponse.json(
      { error: "Failed to create raw material category" },
      { status: 500 },
    );
  }
}
