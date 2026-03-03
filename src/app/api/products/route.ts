import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

// GET /api/products - ดึงรายการสินค้าทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const searchQuery = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const productType = searchParams.get("productType");

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
    };

    if (searchQuery) {
      where.OR = [
        { code: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (productType) {
      where.product_type_id = productType;
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Get paginated data with relations
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name_i18n: true,
          },
        },
        base_unit: {
          select: {
            id: true,
            name_i18n: true,
            abbreviation_i18n: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// POST /api/products - สร้างสินค้าใหม่ (with transaction)
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
      product_type_id,
      base_unit_id,
      image_url,
      is_active,
      has_serial,
      has_expiry,
      min_stock_level,
      low_stock_threshold,
      current_stock,
      track_stock,
      selling_price,
      cost_price,
      product_units,
      recipes,
    } = body;

    // Validation
    if (!code || !name_i18n || !product_type_id || !base_unit_id) {
      return NextResponse.json(
        { error: "Code, name, product type, and base unit are required" },
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

    // Use transaction to create product with nested relations
    const product = await prisma.$transaction(async (tx) => {
      return await tx.product.create({
        data: {
          code,
          name_i18n,
          description_i18n: description_i18n || null,
          category_id: category_id || null,
          product_type_id,
          base_unit_id,
          image_url: image_url || null,
          is_active: is_active ?? true,
          has_serial: has_serial ?? false,
          has_expiry: has_expiry ?? false,
          min_stock_level: min_stock_level || 0,
          low_stock_threshold: low_stock_threshold || 0,
          current_stock: current_stock || 0,
          track_stock: track_stock ?? true,
          selling_price: selling_price || null,
          cost_price: cost_price || null,
          
          // Nested create for product_units (if provided)
          product_units: product_units?.length > 0 ? {
            create: product_units.map((unit: any) => ({
              unit_id: unit.unit_id,
              is_base_unit: unit.is_base_unit ?? false,
              is_selling_unit: unit.is_selling_unit ?? true,
              is_purchase_unit: unit.is_purchase_unit ?? false,
              selling_price: unit.selling_price || null,
              cost_price: unit.cost_price || null,
              conversion_to_base: unit.conversion_to_base || 1,
              barcode: unit.barcode || null,
            }))
          } : undefined,
          
          // Nested create for recipes (if provided)
          recipes: recipes?.length > 0 ? {
            create: recipes.map((recipe: any) => ({
              name_i18n: recipe.name_i18n,
              is_default: recipe.is_default ?? true,
              serving_qty: recipe.serving_qty || 1,
              serving_unit_id: recipe.serving_unit_id || null,
              
              // Nested create for recipe ingredients
              ingredients: recipe.ingredients?.length > 0 ? {
                create: recipe.ingredients.map((ing: any) => ({
                  ingredient_id: ing.ingredient_id,
                  quantity: ing.quantity,
                  unit_id: ing.unit_id,
                  is_optional: ing.is_optional ?? false,
                  note_i18n: ing.note_i18n || null,
                }))
              } : undefined,
            }))
          } : undefined,
        },
        include: {
          category: true,
          base_unit: true,
          product_type: true,
          product_units: {
            include: {
              unit: true,
            },
          },
          recipes: {
            include: {
              ingredients: {
                include: {
                  ingredient: true,
                  unit: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
