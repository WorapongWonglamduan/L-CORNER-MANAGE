import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

// DELETE /api/recipes/[id] - ลบ recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.update");
    if (denied) return denied;

    const { id } = await params;

    // Scoped transitively through Recipe.product_id -> Product.shop_id —
    // Recipe has no shop_id column of its own.
    const existing = await prisma.recipe.findFirst({
      where: { id, product: { shop_id: session!.user.shop_id! } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // SaleItem.recipe_id -> Recipe is ON DELETE SET NULL, so without this
    // check, hard-deleting a recipe that's been used in past sales would
    // silently null out recipe_id on every one of those historical sale
    // items — losing which recipe/version produced a past semi-finished
    // sale, the same audit-trail concern this codebase otherwise protects
    // carefully (e.g. SaleRefund never mutates the original sale record).
    const saleItemCount = await prisma.saleItem.count({ where: { recipe_id: id } });
    if (saleItemCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete a recipe used in ${saleItemCount} past sale item(s) — deactivate it instead (is_active: false)`,
        },
        { status: 400 },
      );
    }

    // Delete all recipe ingredients first
    await prisma.recipeIngredient.deleteMany({
      where: { recipe_id: id },
    });

    // Delete the recipe
    await prisma.recipe.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 },
    );
  }
}
