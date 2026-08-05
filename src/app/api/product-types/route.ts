import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { PRODUCTS_TYPES } from "@/constants/input-types";

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

// POST /api/product-types - สร้างประเภทสินค้าใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;
    const shopId = session!.user.shop_id!;

    const body = await request.json();
    const { code, name_i18n, icon, sort_order, is_active } = body;

    // Validation
    if (!code || !name_i18n) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 },
      );
    }

    // Check if code already exists within this shop (code is only unique
    // per shop_id, not system-wide — see @@unique([shop_id, code]))
    const existing = await prisma.productType.findFirst({
      where: { code, shop_id: shopId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Product type code already exists" },
        { status: 400 },
      );
    }

    // `type` (semi_finished/finished_good/ingredient/container) isn't a
    // field on this form — it drives recipe/stock logic elsewhere in the
    // app (see products/form/helper.tsx, api/products/route.ts), so it's
    // provisioned automatically per shop (api/admin/shops/route.ts) rather
    // than left for a shop admin to invent through this endpoint. Anything
    // created here is the generic, functionally-inert "product" type.
    const productType = await prisma.productType.create({
      data: {
        shop_id: shopId,
        code,
        name_i18n,
        icon,
        type: PRODUCTS_TYPES.PRODUCT,
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
