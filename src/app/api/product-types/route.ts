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
    const where: Prisma.ProductTypeWhereInput = { shop_id: session!.user.shop_id! };

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

// POST /api/product-types - ปิดการสร้างประเภทสินค้าเอง
//
// The 4 product types a shop needs (ingredient/semi_finished/finished_good/
// container) are provisioned once, automatically, when the shop is created
// (api/admin/shops/route.ts) and never change — `type` drives recipe/stock
// logic elsewhere (products/form/helper.tsx, api/products/route.ts), so a
// shop admin inventing new ones here has no way to give them working
// behavior, and deleting/editing the real ones would break product
// creation. This endpoint is read-only by design; there is no create path.
export async function POST() {
  return NextResponse.json(
    { error: "Product types are managed by the system and cannot be created" },
    { status: 403 },
  );
}
