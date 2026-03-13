import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/recipes - ดึงข้อมูล recipes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const includeIngredients = searchParams.get("include_ingredients") === "true";

    const where: any = {
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
            }
          : false,
      },
      orderBy: [
        { is_default: "desc" },
        { created_at: "desc" },
      ],
    });

    return NextResponse.json({
      items: recipes,
      total: recipes.length,
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
