import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

// GET /api/product-types - ดึงรายการประเภทสินค้าทั้งหมด
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
    const type = searchParams.get("type");

    // Build where clause
    const where: Prisma.ProductTypeWhereInput = {};

    if (type && type !== null) {
      const types = type.split(",").map((t) => t.trim());
      if (types.length > 1) {
        where.type = { in: types };
      } else {
        where.type = type;
      }
    }

    if (searchQuery) {
      where.OR = [
        { code: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    // Get total count
    const total = await prisma.productType.count({ where });

    // Get paginated data
    const types = await prisma.productType.findMany({
      where,
      orderBy: { sort_order: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: types,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching product types:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch product types",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST /api/product-types - สร้างประเภทสินค้าใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const body = await request.json();
    const { code, name_i18n, icon, /*  type, */ sort_order, is_active } = body;

    // Validation
    if (!code || !name_i18n /* || !type */) {
      return NextResponse.json(
        { error: "Code, name, and type are required" },
        { status: 400 },
      );
    }

    // Validate type
    // if (!["raw_material", "product", "semi_finished", "finished_good"].includes(type)) {
    //   return NextResponse.json(
    //     { error: "Type must be 'raw_material', 'product', 'semi_finished', or 'finished_good'" },
    //     { status: 400 },
    //   );
    // }

    // Check if code already exists
    const existing = await prisma.productType.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Product type code already exists" },
        { status: 400 },
      );
    }

    const productType = await prisma.productType.create({
      data: {
        code,
        name_i18n,
        icon,
        // type,
        sort_order: sort_order ? parseInt(sort_order) : 0,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(productType, { status: 201 });
  } catch (error) {
    console.error("Error creating product type:", error);
    return NextResponse.json(
      { error: "Failed to create product type" },
      { status: 500 },
    );
  }
}
