import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// POST /api/recipe-ingredients - สร้าง recipe ingredient ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      recipe_id,
      raw_material_id,
      quantity,
      unit_id,
    } = body;

    if (!recipe_id || !raw_material_id || !quantity || !unit_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const ingredient = await prisma.recipeIngredient.create({
      data: {
        recipe_id,
        raw_material_id,
        quantity,
        unit_id,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe ingredient:", error);
    return NextResponse.json(
      { error: "Failed to create recipe ingredient" },
      { status: 500 },
    );
  }
}
