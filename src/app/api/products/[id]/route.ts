import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import type { RecipeInput } from "@/types/product-request";
import { normalizeMediaUrl } from "@/lib/media-url";

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

    const product = await prisma.product.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
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
        stock: true,
        _count: {
          select: {
            sale_items: true,
            recipe_ingredients: true,
            toppings_as_ingredient: true,
            transfers: true,
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
      url: normalizeMediaUrl(pm.media.file_path),
      isPrimary: pm.is_primary,
      sortOrder: pm.sort_order,
    })) || [];

    // Product detail is master data (no warehouse selector on this page), so
    // stock figures are summed across every warehouse the product is stocked at.
    const { stock, _count, ...productRest } = product;
    const stockTotals = stock.reduce(
      (acc, s) => ({
        current_stock: acc.current_stock + Number(s.current_stock),
        min_stock_level: acc.min_stock_level + Number(s.min_stock_level),
        low_stock_threshold: acc.low_stock_threshold + Number(s.low_stock_threshold),
      }),
      { current_stock: 0, min_stock_level: 0, low_stock_threshold: 0 },
    );

    // Same rule as GET /api/products' list view — hard-deleting a product
    // still referenced by sale history/recipes/toppings/transfers would
    // either silently destroy that history (if the relation ever became
    // SET NULL/CASCADE) or just fail loudly; either way the "Delete"
    // button on the detail page shouldn't offer it as an option.
    const can_delete =
      _count.sale_items === 0 &&
      _count.recipe_ingredients === 0 &&
      _count.toppings_as_ingredient === 0 &&
      _count.transfers === 0;

    return NextResponse.json({
      ...productRest,
      ...stockTotals,
      images,
      can_delete,
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
      track_stock,
      selling_price,
      cost_price,
      recipes,
      media_data,
    } = body;

    const shopId = session!.user.shop_id!;

    // Check if product exists
    const existing = await prisma.product.findFirst({
      where: { id, shop_id: shopId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
    // Scoped by shop_id so a caller can't move their product onto another
    // shop's product type.
    const newProductType = await prisma.productType.findFirst({
      where: { id: product_type_id, shop_id: shopId },
    });
    if (!newProductType) {
      return NextResponse.json(
        { error: "Product type not found" },
        { status: 400 },
      );
    }
    const isSemiFinished = newProductType.type === PRODUCTS_TYPES.SEMI_FINISHED;

    if (!isSemiFinished && recipes && recipes.length > 0) {
      return NextResponse.json(
        { error: "Only semi-finished products can have recipes" },
        { status: 400 },
      );
    }

    // Same reasoning for base unit / category — verify they belong to the
    // caller's shop before attaching them.
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

    // Same reasoning as products/route.ts POST: every ingredient/unit a
    // recipe references must belong to the caller's shop too.
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

    // Use transaction to update product and recipes
    const product = await prisma.$transaction(async (tx) => {
      // The product-edit form always round-trips a freshly-built `recipes`
      // array on every save of a semi-finished product — including a plain
      // price/name edit that never touched the recipe section. Deleting and
      // recreating the Recipe row on every such save would give it a brand
      // new id, and since SaleItem.recipe_id -> Recipe is nullable with
      // ON DELETE SET NULL, that silently erases the recipe reference from
      // every past sale that used it — defeating the exact history
      // protection DELETE /api/recipes/[id] was hardened with. Update the
      // existing recipe row IN PLACE (same id) instead; only ingredients are
      // replaced (RecipeIngredient has no history pointing at it directly).
      if (!isSemiFinished) {
        // Type changed away from semi_finished — no recipe applies anymore.
        await tx.recipeIngredient.deleteMany({
          where: { recipe: { product_id: id } },
        });
        await tx.recipe.deleteMany({ where: { product_id: id } });
      } else if (recipes !== undefined) {
        const existingRecipes = await tx.recipe.findMany({
          where: { product_id: id },
        });

        if (!recipes || recipes.length === 0) {
          // Recipe explicitly cleared by the caller.
          await tx.recipeIngredient.deleteMany({
            where: { recipe: { product_id: id } },
          });
          await tx.recipe.deleteMany({ where: { product_id: id } });
        } else {
          const incoming = recipes[0] as RecipeInput;
          const targetRecipe =
            existingRecipes.find((r) => r.is_default) ?? existingRecipes[0];

          let recipeId: string;
          if (targetRecipe) {
            await tx.recipe.update({
              where: { id: targetRecipe.id },
              data: {
                name_i18n: incoming.name_i18n as unknown as Prisma.InputJsonValue,
                is_default: incoming.is_default ?? true,
                serving_qty: incoming.serving_qty || 1,
                serving_unit_id: incoming.serving_unit_id || null,
              },
            });
            recipeId = targetRecipe.id;
            await tx.recipeIngredient.deleteMany({
              where: { recipe_id: recipeId },
            });
          } else {
            const created = await tx.recipe.create({
              data: {
                product_id: id,
                name_i18n: incoming.name_i18n as unknown as Prisma.InputJsonValue,
                is_default: incoming.is_default ?? true,
                serving_qty: incoming.serving_qty || 1,
                serving_unit_id: incoming.serving_unit_id || null,
              },
            });
            recipeId = created.id;
          }

          // The UI only ever manages one recipe per product — clean up any
          // others so this stays the single source of truth going forward.
          const extraRecipeIds = existingRecipes
            .filter((r) => r.id !== recipeId)
            .map((r) => r.id);
          if (extraRecipeIds.length > 0) {
            await tx.recipeIngredient.deleteMany({
              where: { recipe_id: { in: extraRecipeIds } },
            });
            await tx.recipe.deleteMany({
              where: { id: { in: extraRecipeIds } },
            });
          }

          if (incoming.ingredients && incoming.ingredients.length > 0) {
            await tx.recipeIngredient.createMany({
              data: incoming.ingredients.map((ing) => ({
                recipe_id: recipeId,
                ingredient_id: ing.ingredient_id,
                quantity: ing.quantity,
                unit_id: ing.unit_id,
                is_optional: ing.is_optional ?? false,
                note_i18n: ing.note_i18n
                  ? (ing.note_i18n as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              })),
            });
          }
        }
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
          track_stock,
          selling_price: selling_price ?? undefined,
          cost_price: cost_price ?? undefined,
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

    const product = await prisma.product.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
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

    // A hard delete only ever hits this on a real dependency Postgres still
    // RESTRICTs on purpose: sale history, use as a recipe/topping ingredient,
    // or a past stock transfer. Deleting those out from under it would
    // silently corrupt other records, so surface why instead of a generic
    // 500 — the caller should deactivate (soft delete) the product instead.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this product — it has sales history or is used as an ingredient/topping elsewhere. Deactivate it instead.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
