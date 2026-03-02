import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/raw-materials - ดึงรายการวัตถุดิบทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const category = searchParams.get("category");

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (isActive !== null) {
      where.is_active = isActive === "true";
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.rawMaterial.count({ where });

    // Get paginated data
    const rawMaterials = await prisma.rawMaterial.findMany({
      where,
      include: {
        unit: true,
        category: true,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: rawMaterials,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw materials" },
      { status: 500 }
    );
  }
}

// POST /api/raw-materials - สร้างวัตถุดิบใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      name_i18n,
      description_i18n,
      category_id,
      unit_id,
      cost_price,
      min_stock,
      current_stock,
      is_active,
    } = body;

    // Validation
    if (!code || !name_i18n || !unit_id) {
      return NextResponse.json(
        { error: "code, name_i18n, and unit_id are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.rawMaterial.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Raw material code already exists" },
        { status: 400 }
      );
    }

    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        code,
        name_i18n,
        description_i18n: description_i18n || null,
        category_id: category_id || null,
        unit_id,
        cost_price: cost_price || null,
        min_stock: min_stock || 0,
        current_stock: current_stock || 0,
        is_active: is_active ?? true,
      },
      include: {
        unit: true,
        category: true,
      },
    });

    return NextResponse.json(rawMaterial, { status: 201 });
  } catch (error) {
    console.error("Error creating raw material:", error);
    return NextResponse.json(
      { error: "Failed to create raw material" },
      { status: 500 }
    );
  }
}
