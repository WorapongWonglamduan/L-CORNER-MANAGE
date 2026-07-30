import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { normalizeMediaUrl } from "@/lib/media-url";

// GET /api/ingredients-and-containers - ดึงรายการวัตถุดิบ/ภาชนะทั้งหมด (จาก products table)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const typeId = searchParams.get("type_id");

    // Build where clause - query from products table
    const where: Record<string, unknown> = {
      // Filter ingredient and container product types
      product_type: {
        type: {
          in: [PRODUCTS_TYPES.INGREDIENT, PRODUCTS_TYPES.CONTAINER],
        },
      },
    };

    if (isActive !== null) {
      where.is_active = isActive === "true";
    }

    if (typeId) {
      where.product_type_id = typeId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    // Get total count from products
    const total = await prisma.product.count({ where });

    // Get paginated data from products
    const ingredientsAndContainers = await prisma.product.findMany({
      where,
      include: {
        base_unit: true,
        product_type: true,
        media: {
          include: {
            media: true,
          },
          orderBy: {
            sort_order: "asc",
          },
        },
        stock: true,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Transform to match the ingredients-and-containers response shape.
    // This is master data (no warehouse selector here), so stock is summed
    // across every warehouse the ingredient/container is stocked at.
    const items = ingredientsAndContainers.map((product) => {
      // Find primary image from ProductMedia relations
      const primaryProductMedia = product.media?.find(
        (pm) => pm.is_primary,
      );
      const primaryImageUrl = primaryProductMedia?.media?.file_path
        ? normalizeMediaUrl(primaryProductMedia.media.file_path)
        : null;

      const stockTotals = product.stock.reduce(
        (acc, s) => ({
          min_stock: acc.min_stock + Number(s.min_stock_level),
          current_stock: acc.current_stock + Number(s.current_stock),
        }),
        { min_stock: 0, current_stock: 0 },
      );

      return {
        id: product.id,
        code: product.code,
        name_i18n: product.name_i18n,
        description_i18n: product.description_i18n,
        type_id: product.product_type_id,
        unit_id: product.base_unit_id,
        cost_price: product.cost_price,
        min_stock: stockTotals.min_stock,
        current_stock: stockTotals.current_stock,
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
        unit: product.base_unit,
        type: product.product_type,
        primary_image_url: primaryImageUrl,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching ingredients/containers:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredients/containers" },
      { status: 500 },
    );
  }
}

// POST /api/ingredients-and-containers - สร้างวัตถุดิบ/ภาชนะใหม่ (ใน products table)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.create");
    if (denied) return denied;

    const body = await request.json();

    const {
      code,
      name_i18n,
      description_i18n,
      type_id,
      unit_id,
      cost_price,
      is_active,
      media_data,
    } = body;

    // Validation
    if (!code || !name_i18n || !unit_id || !type_id) {
      return NextResponse.json(
        { error: "code, name_i18n, unit_id, and type_id are required" },
        { status: 400 },
      );
    }

    // Check if code already exists
    const existing = await prisma.product.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Product code already exists" },
        { status: 400 },
      );
    }

    // Create as a product with an ingredient/container product type
    const product = await prisma.product.create({
      data: {
        code,
        name_i18n,
        description_i18n: description_i18n || null,
        product_type_id: type_id,
        base_unit_id: unit_id,
        cost_price: cost_price || null,
        is_active: is_active ?? true,
        track_stock: true,
        has_serial: false,
        has_expiry: false,
      },
      include: {
        base_unit: true,
        product_type: true,
      },
    });

    // Create ProductMedia relations if media_data provided
    if (media_data && Array.isArray(media_data) && media_data.length > 0) {
      // Create ProductMedia relations
      await prisma.productMedia.createMany({
        data: media_data.map(
          (media: { id: string; isPrimary: boolean; sortOrder: number }) => ({
            product_id: product.id,
            media_id: media.id,
            is_primary: media.isPrimary,
            sort_order: media.sortOrder,
          }),
        ),
      });

      // Update Media records to set entity_type and entity_id
      const mediaIds = media_data.map((m: { id: string }) => m.id);
      await prisma.media.updateMany({
        where: {
          id: { in: mediaIds },
        },
        data: {
          entity_type: "product",
          entity_id: product.id,
        },
      });
    }

    // Transform to match the ingredients-and-containers response shape
    const ingredientContainer = {
      id: product.id,
      code: product.code,
      name_i18n: product.name_i18n,
      description_i18n: product.description_i18n,
      type_id: product.product_type_id,
      unit_id: product.base_unit_id,
      cost_price: product.cost_price,
      min_stock: 0,
      current_stock: 0,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      unit: product.base_unit,
      type: product.product_type,
    };

    return NextResponse.json(ingredientContainer, { status: 201 });
  } catch (error) {
    console.error("Error creating ingredient/container:", error);
    return NextResponse.json(
      { error: "Failed to create ingredient/container" },
      { status: 500 },
    );
  }
}
