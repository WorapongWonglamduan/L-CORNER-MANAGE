import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PRODUCTS_TYPES } from "@/constants/input-types";

// GET /api/raw-materials - ดึงรายการวัตถุดิบทั้งหมด (จาก products table)
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
    const typeId = searchParams.get("type_id");

    // Build where clause - query from products table
    const where: Record<string, unknown> = {
      // Filter raw material and semi-finished product types
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
    const rawMaterials = await prisma.product.findMany({
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
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Transform to match old raw_materials format
    const items = rawMaterials.map((product) => {
      // Find primary image from ProductMedia relations
      const primaryProductMedia = product.media?.find(
        (pm: any) => pm.is_primary,
      );
      let primaryImageUrl = primaryProductMedia?.media?.file_path || null;

      // Convert backslashes to forward slashes for Next.js Image component
      if (primaryImageUrl) {
        primaryImageUrl = primaryImageUrl.replace(/\\/g, "/");
      }

      return {
        id: product.id,
        code: product.code,
        name_i18n: product.name_i18n,
        description_i18n: product.description_i18n,
        type_id: product.product_type_id,
        unit_id: product.base_unit_id,
        cost_price: product.cost_price,
        min_stock: product.min_stock_level,
        current_stock: product.current_stock,
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
    console.error("Error fetching raw materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw materials" },
      { status: 500 },
    );
  }
}

// POST /api/raw-materials - สร้างวัตถุดิบใหม่ (ใน products table)
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
      type_id,
      unit_id,
      cost_price,
      min_stock,
      current_stock,
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

    // Create as product with raw_material type
    const product = await prisma.product.create({
      data: {
        code,
        name_i18n,
        description_i18n: description_i18n || null,
        product_type_id: type_id,
        base_unit_id: unit_id,
        cost_price: cost_price || null,
        min_stock_level: min_stock || 0,
        current_stock: current_stock || 0,
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

    // Transform to match old raw_materials format
    const rawMaterial = {
      id: product.id,
      code: product.code,
      name_i18n: product.name_i18n,
      description_i18n: product.description_i18n,
      type_id: product.product_type_id,
      unit_id: product.base_unit_id,
      cost_price: product.cost_price,
      min_stock: product.min_stock_level,
      current_stock: product.current_stock,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      unit: product.base_unit,
      type: product.product_type,
    };

    return NextResponse.json(rawMaterial, { status: 201 });
  } catch (error) {
    console.error("Error creating raw material:", error);
    return NextResponse.json(
      { error: "Failed to create raw material" },
      { status: 500 },
    );
  }
}
