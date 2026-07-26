import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import type { RecipeInput } from "@/types/product-request";

// GET /api/products - ดึงรายการสินค้าทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const searchQuery = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const productType = searchParams.get("productType");
    const type = searchParams.get("type");
    const stockStatus = searchParams.get("stockStatus");

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

    if (type && type !== null) {
      const types = type.split(",").map((t) => t.trim());
      where.product_type = {
        type: { in: types },
      };
    }

    // Get all products (without pagination first) to filter by stock status
    const allProducts = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name_i18n: true,
          },
        },
        product_type: {
          select: {
            id: true,
            name_i18n: true,
            type: true,
          },
        },
        base_unit: {
          select: {
            id: true,
            name_i18n: true,
            abbreviation_i18n: true,
          },
        },
        recipes: {
          where: {
            is_default: true,
            is_active: true,
          },
          include: {
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    name_i18n: true,
                    current_stock: true,
                  },
                },
                unit: {
                  select: {
                    id: true,
                    name_i18n: true,
                    abbreviation_i18n: true,
                  },
                },
              },
            },
          },
        },
        media: {
          include: {
            media: {
              select: {
                id: true,
                file_path: true,
              },
            },
          },
          where: {
            is_primary: true,
          },
          orderBy: {
            sort_order: "asc",
          },
          take: 1,
        },
      },
      orderBy: { created_at: "desc" },
    });

    // คำนวณ available_quantity สำหรับแต่ละสินค้า
    const productsWithAvailability = allProducts.map((product) => {
      let available_quantity = 0;

      // FINISHED_GOOD: ใช้ current_stock ของตัวเอง
      if (product.product_type.type === PRODUCTS_TYPES.FINISHED_GOOD) {
        available_quantity = Number(product.current_stock) || 0;
      }
      // SEMI_FINISHED: คำนวณจากวัตถุดิบในสูตร
      else if (product.product_type.type === PRODUCTS_TYPES.SEMI_FINISHED) {
        const defaultRecipe = product.recipes[0];

        if (defaultRecipe && defaultRecipe.ingredients.length > 0) {
          // หาจำนวนที่ผลิตได้สูงสุดจากวัตถุดิบแต่ละตัว
          const maxQuantities = defaultRecipe.ingredients.map((ingredient) => {
            const ingredientStock =
              Number(ingredient.ingredient.current_stock) || 0;
            const requiredQuantity = Number(ingredient.quantity) || 1;
            return Math.floor(ingredientStock / requiredQuantity);
          });

          // ใช้ค่าต่ำสุดเป็น available_quantity
          available_quantity =
            maxQuantities.length > 0 ? Math.min(...maxQuantities) : 0;
        }
      }

      // Get primary image URL and normalize path for Next.js Image
      let primary_image_url = product.media?.[0]?.media?.file_path || null;
      if (primary_image_url) {
        // Convert backslashes to forward slashes and ensure leading slash
        primary_image_url = primary_image_url.replace(/\\/g, '/');
        if (!primary_image_url.startsWith('/')) {
          primary_image_url = '/' + primary_image_url;
        }
      }

      return {
        ...product,
        available_quantity,
        primary_image_url,
      };
    });

    // Filter by stock status if specified
    let filteredProducts = productsWithAvailability;
    if (stockStatus) {
      filteredProducts = productsWithAvailability.filter((product) => {
        const currentStock = Number(product.current_stock) || 0;
        const threshold = Number(product.low_stock_threshold) || 0;

        if (stockStatus === "out") {
          return currentStock <= 0;
        } else if (stockStatus === "low") {
          return currentStock > 0 && currentStock <= threshold;
        } else if (stockStatus === "normal") {
          return currentStock > threshold;
        }
        return true;
      });
    }

    // Calculate total and total pages from filtered products
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / pageSize);

    // Apply pagination to filtered products
    const paginatedProducts = filteredProducts.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return NextResponse.json({
      items: paginatedProducts,
      total,
      page,
      pageSize,
      totalPages,
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
    const denied = requirePermission(session, "products.create");
    if (denied) return denied;

    const body = await request.json();
    const {
      code,
      name_i18n,
      description_i18n,
      category_id,
      product_type_id,
      base_unit_id,
      is_active,
      has_serial,
      has_expiry,
      min_stock_level,
      low_stock_threshold,
      current_stock,
      track_stock,
      selling_price,
      cost_price,
      recipes,
      media_data,
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

    // Recipes only ever make sense for SEMI_FINISHED products.
    if (recipes && recipes.length > 0) {
      const newProductType = await prisma.productType.findUnique({
        where: { id: product_type_id },
      });
      if (newProductType?.type !== PRODUCTS_TYPES.SEMI_FINISHED) {
        return NextResponse.json(
          { error: "Only semi-finished products can have recipes" },
          { status: 400 },
        );
      }
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
          is_active: is_active ?? true,
          has_serial: has_serial ?? false,
          has_expiry: has_expiry ?? false,
          min_stock_level: min_stock_level || 0,
          low_stock_threshold: low_stock_threshold || 0,
          current_stock: current_stock || 0,
          track_stock: track_stock ?? true,
          selling_price: selling_price || null,
          cost_price: cost_price || null,

          // Nested create for recipes (if provided)
          recipes:
            recipes?.length > 0
              ? {
                  create: recipes.map((recipe: RecipeInput) => ({
                    name_i18n: recipe.name_i18n,
                    is_default: recipe.is_default ?? true,
                    serving_qty: recipe.serving_qty || 1,
                    serving_unit_id: recipe.serving_unit_id || null,

                    // Nested create for recipe ingredients
                    ingredients:
                      recipe.ingredients && recipe.ingredients.length > 0
                        ? {
                            create: recipe.ingredients.map((ing) => ({
                              ingredient_id: ing.ingredient_id,
                              quantity: ing.quantity,
                              unit_id: ing.unit_id,
                              is_optional: ing.is_optional ?? false,
                              note_i18n: ing.note_i18n || null,
                            })),
                          }
                        : undefined,
                  })),
                }
              : undefined,
        },
        include: {
          category: true,
          base_unit: true,
          product_type: true,
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

    // Create ProductMedia relations if media_data provided
    if (media_data !== undefined && Array.isArray(media_data) && media_data.length > 0) {
      await prisma.productMedia.createMany({
        data: media_data.map((media: { id: string; isPrimary: boolean; sortOrder: number }) => ({
          product_id: product.id,
          media_id: media.id,
          is_primary: media.isPrimary,
          sort_order: media.sortOrder,
        })),
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

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
