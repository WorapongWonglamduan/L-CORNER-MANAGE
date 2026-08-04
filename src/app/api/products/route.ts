import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission, requireWarehouseAccess } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import type { RecipeInput } from "@/types/product-request";
import { normalizeMediaUrl } from "@/lib/media-url";

// A SEMI_FINISHED product whose recipe has no track_stock ingredient has no
// real enforced ceiling (checkout never blocks on it) — stand-in for
// "unlimited" since available_quantity is a plain number the rest of the
// API/UI already does arithmetic on (JSON has no Infinity).
const UNLIMITED_QUANTITY = 999999;

// GET /api/products - ดึงรายการสินค้าทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const searchQuery = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const productType = searchParams.get("productType");
    const type = searchParams.get("type");
    const stockStatus = searchParams.get("stockStatus");
    // Scopes stock figures to one warehouse (e.g. POS, Inventory). When
    // omitted, stock is summed across every warehouse — used by master-data
    // views (product list/detail, settings) that aren't warehouse-specific.
    const warehouseId = searchParams.get("warehouseId");
    // Products not genuinely sellable anywhere — either no ProductStock row
    // at all, or rows exist but every one is inactive. Mutually exclusive
    // with warehouseId (an admin audit view, not a branch scope).
    const unassigned = searchParams.get("unassigned") === "true";
    // Looks up an exact set of products regardless of the current
    // page/search/category — used by the POS cart to re-fetch live
    // price/stock for whatever's already sitting in the cart.
    const idsParam = searchParams.get("ids");

    if (warehouseId) {
      const deniedWarehouse = requireWarehouseAccess(session, warehouseId);
      if (deniedWarehouse) return deniedWarehouse;
    }

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
      shop_id: session!.user.shop_id!,
    };

    if (unassigned) {
      where.stock = { none: { is_active: true } };
    } else if (warehouseId) {
      // Only include products explicitly assigned (active ProductStock row)
      // to this warehouse — a product with no row here is invisible until added.
      where.stock = { some: { warehouse_id: warehouseId, is_active: true } };
    }

    if (searchQuery) {
      where.OR = [
        { code: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    if (idsParam) {
      const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
      where.id = { in: ids };
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
                    track_stock: true,
                    stock: warehouseId
                      ? { where: { warehouse_id: warehouseId } }
                      : true,
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
        stock: warehouseId ? { where: { warehouse_id: warehouseId } } : true,
        // Whether a hard delete would actually succeed — mirrors the FK
        // checks the DELETE route itself still enforces (sales history /
        // used as a recipe or topping ingredient / has a transfer record).
        // ProductStock isn't counted since it now cascades on delete.
        _count: {
          select: {
            sale_items: true,
            recipe_ingredients: true,
            toppings_as_ingredient: true,
            transfers: true,
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

    // Sums a product's ProductStock rows (already scoped to one warehouse if
    // warehouseId was given) into the flat current_stock/min_stock_level/
    // low_stock_threshold fields the rest of the API/UI still expects.
    const sumStock = (
      stock: {
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
        low_stock_threshold: Prisma.Decimal;
      }[],
    ) =>
      stock.reduce(
        (acc, s) => ({
          current_stock: acc.current_stock + Number(s.current_stock),
          min_stock_level: acc.min_stock_level + Number(s.min_stock_level),
          low_stock_threshold:
            acc.low_stock_threshold + Number(s.low_stock_threshold),
        }),
        { current_stock: 0, min_stock_level: 0, low_stock_threshold: 0 },
      );

    // คำนวณ available_quantity สำหรับแต่ละสินค้า
    const productsWithAvailability = allProducts.map((product) => {
      const { stock, _count, ...productRest } = product;
      const stockTotals = sumStock(stock);
      const can_delete =
        _count.sale_items === 0 &&
        _count.recipe_ingredients === 0 &&
        _count.toppings_as_ingredient === 0 &&
        _count.transfers === 0;
      // Default: FINISHED_GOOD, INGREDIENT, CONTAINER, and any other type
      // just sell/consume directly from their own current_stock — only
      // SEMI_FINISHED overrides this below with a recipe-based figure.
      let available_quantity = stockTotals.current_stock;

      // SEMI_FINISHED: คำนวณจากวัตถุดิบในสูตร — เฉพาะวัตถุดิบที่ track_stock
      // เท่านั้น ให้ตรงกับตอนตัดสต็อกจริง (sales/route.ts's deductProductStock)
      // ซึ่งไม่บังคับเช็คสต็อกพอ/ไม่พอสำหรับวัตถุดิบที่ track_stock=false —
      // ถ้าเอาวัตถุดิบนั้นมาคิดด้วย ตัวเลขที่โชว์จะดูเหมือนเป็นเพดานที่บังคับ
      // ทั้งที่จริงระบบปล่อยให้ขายเกินเพดานนั้นได้
      if (product.product_type.type === PRODUCTS_TYPES.SEMI_FINISHED) {
        const defaultRecipe = product.recipes[0];

        if (defaultRecipe && defaultRecipe.ingredients.length > 0) {
          // หาจำนวนที่ผลิตได้สูงสุดจากวัตถุดิบที่บังคับเช็คสต็อกแต่ละตัว
          const maxQuantities = defaultRecipe.ingredients
            .filter((ingredient) => ingredient.ingredient.track_stock)
            .map((ingredient) => {
              const ingredientStock = sumStock(
                ingredient.ingredient.stock,
              ).current_stock;
              const requiredQuantity = Number(ingredient.quantity) || 1;
              return Math.floor(ingredientStock / requiredQuantity);
            });

          // ใช้ค่าต่ำสุดเป็น available_quantity — ถ้าไม่มีวัตถุดิบที่ track_stock
          // เลยสักตัว แปลว่าไม่มีเพดานที่ระบบจะบังคับจริง (ไม่จำกัด)
          available_quantity =
            maxQuantities.length > 0
              ? Math.min(...maxQuantities)
              : UNLIMITED_QUANTITY;
        }
      }

      // Get primary image URL and normalize path for Next.js Image
      const primary_image_url = product.media?.[0]?.media?.file_path
        ? normalizeMediaUrl(product.media[0].media.file_path)
        : null;

      return {
        ...productRest,
        ...stockTotals,
        available_quantity,
        primary_image_url,
        can_delete,
      };
    });

    // Filter by stock status if specified. Uses available_quantity, not the
    // raw current_stock sum — for a SEMI_FINISHED product those two can
    // differ a lot (current_stock only reflects units pre-made via
    // /api/production, which a made-fresh-per-order shop may never use, so
    // it can sit at 0 while available_quantity — how many more servings
    // the remaining ingredients allow — is high). Filtering by the raw
    // sum would call a fully-sellable item "out of stock".
    let filteredProducts = productsWithAvailability;
    if (stockStatus) {
      filteredProducts = productsWithAvailability.filter((product) => {
        const availableQuantity = Number(product.available_quantity) || 0;
        const threshold = Number(product.low_stock_threshold) || 0;

        if (stockStatus === "out") {
          return availableQuantity <= 0;
        } else if (stockStatus === "low") {
          return availableQuantity > 0 && availableQuantity <= threshold;
        } else if (stockStatus === "normal") {
          return availableQuantity > threshold;
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
      page * pageSize,
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
      track_stock,
      selling_price,
      cost_price,
      recipes,
      media_data,
      warehouse_ids,
    } = body;

    // Validation
    if (!code || !name_i18n || !product_type_id || !base_unit_id) {
      return NextResponse.json(
        { error: "Code, name, product type, and base unit are required" },
        { status: 400 },
      );
    }
    if (
      (selling_price !== undefined && selling_price !== null && Number(selling_price) < 0) ||
      (cost_price !== undefined && cost_price !== null && Number(cost_price) < 0)
    ) {
      return NextResponse.json(
        { error: "selling_price and cost_price cannot be negative" },
        { status: 400 },
      );
    }

    const shopId = session!.user.shop_id!;

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

    // Verify the product type / base unit (and category, if given) actually
    // belong to the caller's shop — otherwise a caller could attach another
    // shop's category/type/unit to their product.
    const newProductType = await prisma.productType.findFirst({
      where: { id: product_type_id, shop_id: shopId },
    });
    if (!newProductType) {
      return NextResponse.json(
        { error: "Product type not found" },
        { status: 400 },
      );
    }

    const baseUnit = await prisma.unit.findFirst({
      where: { id: base_unit_id, shop_id: shopId },
    });
    if (!baseUnit) {
      return NextResponse.json(
        { error: "Base unit not found" },
        { status: 400 },
      );
    }

    if (category_id) {
      const category = await prisma.category.findFirst({
        where: { id: category_id, shop_id: shopId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 },
        );
      }
    }

    // Recipes only ever make sense for SEMI_FINISHED products.
    if (
      recipes &&
      recipes.length > 0 &&
      newProductType.type !== PRODUCTS_TYPES.SEMI_FINISHED
    ) {
      return NextResponse.json(
        { error: "Only semi-finished products can have recipes" },
        { status: 400 },
      );
    }

    // Every ingredient/unit referenced by a nested recipe must belong to the
    // caller's shop too — otherwise a recipe could attach another shop's
    // ingredient product via a guessed id.
    if (recipes && recipes.length > 0) {
      const ingredientIds = new Set<string>();
      const unitIds = new Set<string>();
      for (const recipe of recipes as RecipeInput[]) {
        for (const ing of recipe.ingredients ?? []) {
          ingredientIds.add(ing.ingredient_id);
          unitIds.add(ing.unit_id);
        }
      }
      if (ingredientIds.size > 0) {
        const [ownedIngredients, ownedUnits] = await Promise.all([
          prisma.product.findMany({
            where: { id: { in: [...ingredientIds] }, shop_id: shopId },
            select: { id: true },
          }),
          prisma.unit.findMany({
            where: { id: { in: [...unitIds] }, shop_id: shopId },
            select: { id: true },
          }),
        ]);
        if (
          ownedIngredients.length !== ingredientIds.size ||
          ownedUnits.length !== unitIds.size
        ) {
          return NextResponse.json(
            { error: "One or more recipe ingredients or units were not found" },
            { status: 400 },
          );
        }
      }
    }

    // Use transaction to create product with nested relations
    const product = await prisma.$transaction(async (tx) => {
      return await tx.product.create({
        data: {
          shop_id: shopId,
          code,
          name_i18n,
          description_i18n: description_i18n || null,
          category_id: category_id || null,
          product_type_id,
          base_unit_id,
          is_active: is_active ?? true,
          has_serial: has_serial ?? false,
          has_expiry: has_expiry ?? false,
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

    // Assign the new product to whichever branches were selected — a
    // product with no ProductStock row anywhere is invisible at every
    // warehouse until explicitly added (allow-list, not deny-list).
    // Filter to the caller's own assigned branches so a client can't post a
    // warehouse it has no access to.
    const validWarehouseIds = (
      Array.isArray(warehouse_ids) ? warehouse_ids : []
    ).filter((id: string) => session?.user?.warehouse_ids?.includes(id));

    if (validWarehouseIds.length > 0) {
      await prisma.productStock.createMany({
        data: validWarehouseIds.map((warehouse_id: string) => ({
          product_id: product.id,
          warehouse_id,
          current_stock: 0,
          is_active: true,
        })),
      });
    }

    // Create ProductMedia relations if media_data provided
    if (
      media_data !== undefined &&
      Array.isArray(media_data) &&
      media_data.length > 0
    ) {
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

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
