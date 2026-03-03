import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
      yield_quantity,
      yield_unit_id,
      is_active,
    } = body;

    if (!product_id || !name_i18n || !yield_quantity || !yield_unit_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const recipe = await prisma.recipe.create({
      data: {
        product_id,
        name_i18n,
        yield_quantity,
        yield_unit_id,
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
