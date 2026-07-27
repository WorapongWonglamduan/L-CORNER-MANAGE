import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

// GET /api/recipes - ดึงข้อมูล recipes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const includeIngredients = searchParams.get("include_ingredients") === "true";
    // Scopes ingredient stock to one warehouse (used by the production
    // planning preview); when omitted, stock is summed across all warehouses.
    const warehouseId = searchParams.get("warehouseId");

    const where: Prisma.RecipeWhereInput = {
      is_active: true,
    };

    if (productId) {
      where.product_id = productId;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name_i18n: true,
          },
        },
        serving_unit: {
          select: {
            id: true,
            name_i18n: true,
            abbreviation_i18n: true,
          },
        },
        ingredients: includeIngredients
          ? {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    code: true,
                    name_i18n: true,
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
            }
          : false,
      },
      orderBy: [
        { is_default: "desc" },
        { created_at: "desc" },
      ],
    });

    // Flatten each ingredient's ProductStock rows into the current_stock
    // number consumers already expect (summed, or the single scoped-warehouse
    // row when warehouseId was given). Cast needed because Prisma's
    // conditional `ingredients: includeIngredients ? {...} : false` include
    // makes the static return type a union TS can't narrow from the same
    // runtime flag here.
    interface RecipeWithIngredientStock {
      ingredients: {
        ingredient: { stock: { current_stock: Prisma.Decimal }[] };
      }[];
    }
    const items = includeIngredients
      ? (recipes as unknown as RecipeWithIngredientStock[]).map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((ri) => ({
            ...ri,
            ingredient: {
              ...ri.ingredient,
              current_stock: ri.ingredient.stock.reduce(
                (sum, s) => sum + Number(s.current_stock),
                0,
              ),
            },
          })),
        }))
      : recipes;

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}

// POST /api/recipes - สร้าง recipe ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.update");
    if (denied) return denied;

    const body = await request.json();
    const {
      product_id,
      name_i18n,
      serving_qty,
      serving_unit_id,
      is_active,
    } = body;

    if (!product_id || !name_i18n || !serving_qty || !serving_unit_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const recipe = await prisma.recipe.create({
      data: {
        product_id,
        name_i18n,
        serving_qty,
        serving_unit_id,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 },
    );
  }
}
