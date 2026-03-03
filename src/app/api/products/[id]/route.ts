import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/products/[id] - ดึงข้อมูลสินค้าตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// PUT /api/products/[id] - อัพเดทข้อมูลสินค้า
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
      recipes,
    } = body;

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if code is being changed and if new code already exists
    if (code !== existing.code) {
      const codeExists = await prisma.product.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Product code already exists" },
          { status: 400 },
        );
      }
    }

    // Use transaction to update product and recipes
    const product = await prisma.$transaction(async (tx) => {
      // Delete existing recipes if new recipes are provided
      if (recipes !== undefined) {
        // First, delete all recipe ingredients for this product's recipes
        await tx.recipeIngredient.deleteMany({
          where: {
            recipe: {
              product_id: id,
            },
          },
        });

        // Then delete the recipes
        await tx.recipe.deleteMany({
          where: { product_id: id },
        });
      }

      // Update product
      return await tx.product.update({
        where: { id },
        data: {
          code,
          name_i18n,
          description_i18n: description_i18n || null,
          category_id: category_id || null,
          product_type_id,
          base_unit_id,
          image_url: image_url || null,
          is_active,
          has_serial,
          has_expiry,
          min_stock_level: min_stock_level || 0,
          low_stock_threshold: low_stock_threshold || 0,
          current_stock: current_stock ?? undefined,
          track_stock,
          selling_price: selling_price ?? undefined,
          cost_price: cost_price ?? undefined,

          // Create new recipes if provided
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

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

// DELETE /api/products/[id] - ลบสินค้า (soft delete or hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (hard) {
      // Hard delete - delete from database using transaction
      await prisma.$transaction(async (tx) => {
        // Delete recipe ingredients first
        await tx.recipeIngredient.deleteMany({
          where: {
            recipe: {
              product_id: id,
            },
          },
        });

        // Delete recipes
        await tx.recipe.deleteMany({
          where: { product_id: id },
        });

        // Delete product units
        await tx.productUnit.deleteMany({
          where: { product_id: id },
        });

        // Finally delete the product
        await tx.product.delete({
          where: { id },
        });
      });
    } else {
      // Soft delete
      await prisma.product.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          is_active: false,
        },
      });
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
