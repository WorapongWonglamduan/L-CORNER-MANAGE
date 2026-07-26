import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import type { RecipeInput } from "@/types/product-request";

// GET /api/products/[id] - ดึงข้อมูลสินค้าตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

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
        media: {
          include: {
            media: true,
          },
          orderBy: {
            sort_order: "asc" as const,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get all images with their metadata
    const images = product.media?.map((pm) => ({
      id: pm.media.id,
      url: pm.media.file_path?.replace(/\\/g, '/') || '',
      isPrimary: pm.is_primary,
      sortOrder: pm.sort_order,
    })) || [];

    return NextResponse.json({
      ...product,
      images,
    });
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
    const denied = requirePermission(session, "products.update");
    if (denied) return denied;

    const { id } = await params;
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

    // Recipes only ever make sense for SEMI_FINISHED products. Determine the
    // *new* type being saved so a type change away from semi_finished always
    // cleans up any existing recipe, regardless of whether the request body
    // happened to include a `recipes` payload (previously, omitting it left
    // orphaned recipes attached to a now-non-semi_finished product).
    const newProductType = await prisma.productType.findUnique({
      where: { id: product_type_id },
    });
    const isSemiFinished =
      newProductType?.type === PRODUCTS_TYPES.SEMI_FINISHED;

    if (!isSemiFinished && recipes && recipes.length > 0) {
      return NextResponse.json(
        { error: "Only semi-finished products can have recipes" },
        { status: 400 },
      );
    }

    // Use transaction to update product and recipes
    const product = await prisma.$transaction(async (tx) => {
      // Replace recipes when: the product is no longer semi_finished (always
      // clear stale recipes), or new recipes were explicitly provided.
      if (!isSemiFinished || recipes !== undefined) {
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
          is_active,
          has_serial,
          has_expiry,
          min_stock_level: min_stock_level || 0,
          low_stock_threshold: low_stock_threshold || 0,
          current_stock: current_stock ?? undefined,
          track_stock,
          selling_price: selling_price ?? undefined,
          cost_price: cost_price ?? undefined,

          // Create new recipes if provided (only ever valid when semi_finished,
          // enforced above)
          recipes:
            isSemiFinished && recipes?.length > 0
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

    // Update ProductMedia relations if media_data provided
    if (media_data !== undefined) {
      // Delete existing relations
      await prisma.productMedia.deleteMany({
        where: { product_id: id },
      });

      // Create new relations
      if (Array.isArray(media_data) && media_data.length > 0) {
        await prisma.productMedia.createMany({
          data: media_data.map((media: { id: string; isPrimary: boolean; sortOrder: number }) => ({
            product_id: id,
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
            entity_id: id,
          },
        });
      }
    }

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
    const denied = requirePermission(session, "products.delete");
    if (denied) return denied;

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
