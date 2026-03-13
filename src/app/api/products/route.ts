import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { PRODUCTS_TYPES } from "@/constants/input-types";

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
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // คำนวณ available_quantity สำหรับแต่ละสินค้า
    const productsWithAvailability = products.map((product) => {
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

      return {
        ...product,
        available_quantity,
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

    return NextResponse.json({
      items: filteredProducts,
      total: filteredProducts.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredProducts.length / pageSize),
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
          product_units:
            product_units?.length > 0
              ? {
                  create: product_units.map((unit) => ({
                    unit_id: unit.unit_id,
                    is_base_unit: unit.is_base_unit ?? false,
                    is_selling_unit: unit.is_selling_unit ?? true,
                    is_purchase_unit: unit.is_purchase_unit ?? false,
                    selling_price: unit.selling_price || null,
                    cost_price: unit.cost_price || null,
                    conversion_to_base: unit.conversion_to_base || 1,
                    barcode: unit.barcode || null,
                  })),
                }
              : undefined,

          // Nested create for recipes (if provided)
          recipes:
            recipes?.length > 0
              ? {
                  create: recipes.map((recipe) => ({
                    name_i18n: recipe.name_i18n,
                    is_default: recipe.is_default ?? true,
                    serving_qty: recipe.serving_qty || 1,
                    serving_unit_id: recipe.serving_unit_id || null,

                    // Nested create for recipe ingredients
                    ingredients:
                      recipe.ingredients?.length > 0
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
