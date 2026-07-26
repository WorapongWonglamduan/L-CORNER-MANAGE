import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";

// GET /api/sales/[id] - Get a single sale by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.view");
    if (denied) return denied;

    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        warehouse: true,
        created_by_user: {
          select: {
            id: true,
            full_name: true,
          },
        },
        promotion: { select: { id: true, code: true, name_i18n: true } },
        items: {
          include: {
            product: {
              include: {
                product_type: true,
              },
            },
            recipe: true,
            toppings: {
              include: {
                topping: { select: { id: true, name_i18n: true } },
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/sales/[id] - Update a sale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.void");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const { payment_status, status, note } = body;

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        payment_status,
        status,
        note,
      },
      include: {
        warehouse: true,
        created_by_user: {
          select: {
            id: true,
            full_name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                product_type: true,
              },
            },
            recipe: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error("Error updating sale:", error);
    const message = error instanceof Error ? error.message : "Failed to update sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/sales/[id] - Void/cancel a sale (soft delete) and restore stock
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.void");
    if (denied) return denied;

    const { id } = await params;
    const createdBy = session?.user?.id || null;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { product_type: true } },
            toppings: { include: { topping: true } },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status === "cancelled") {
      return NextResponse.json(
        { error: "Sale is already cancelled" },
        { status: 400 },
      );
    }

    const cancelledSale = await prisma.$transaction(async (tx) => {
      // Restore stock for every item, mirroring deductStock() in reverse.
      for (const item of sale.items) {
        const quantity = Number(item.base_quantity ?? item.quantity);
        const productType = item.product.product_type.type;

        if (productType !== PRODUCTS_TYPES.SEMI_FINISHED) {
          const currentQty = Number(item.product.current_stock) || 0;
          const newQty = currentQty + quantity;

          await tx.product.update({
            where: { id: item.product_id },
            data: { current_stock: newQty },
          });

          await tx.stockMovement.create({
            data: {
              product_id: item.product_id,
              movement_type: "return",
              direction: "in",
              quantity_before: currentQty,
              quantity_change: quantity,
              quantity_after: newQty,
              reference_type: "sale",
              reference_id: sale.id,
              reason_code: "sale_void",
              reason_text: `ยกเลิกการขาย: ${sale.sale_number}`,
              created_by: createdBy || "",
            },
          });
        } else {
          // Recipe used at sale time isn't snapshotted on SaleItem, so we
          // restore against the product's current default recipe (same
          // resolution deductStock() uses when deducting).
          const recipe = await tx.recipe.findFirst({
            where: {
              product_id: item.product_id,
              is_default: true,
              is_active: true,
            },
          });
          if (!recipe) continue;

          const recipeIngredients = await tx.recipeIngredient.findMany({
            where: { recipe_id: recipe.id },
            include: { ingredient: true },
          });

          for (const ri of recipeIngredients) {
            const ingredientQty = Number(ri.quantity) * quantity;
            const currentQty = Number(ri.ingredient.current_stock) || 0;
            const newQty = currentQty + ingredientQty;

            await tx.product.update({
              where: { id: ri.ingredient_id },
              data: { current_stock: newQty },
            });

            await tx.stockMovement.create({
              data: {
                product_id: ri.ingredient_id,
                movement_type: "return",
                direction: "in",
                quantity_before: currentQty,
                quantity_change: ingredientQty,
                quantity_after: newQty,
                reference_type: "sale",
                reference_id: sale.id,
                reason_code: "sale_void",
                reason_text: `คืนวัตถุดิบจากการยกเลิกการขาย: ${sale.sale_number}`,
                created_by: createdBy || "",
              },
            });
          }
        }

        // Restore stock for any toppings selected on this item, regardless
        // of the parent product's own type.
        for (const st of item.toppings) {
          const ingredientRequired =
            Number(st.topping.quantity_per_serving) * Number(st.quantity);
          const ingredient = await tx.product.findUnique({
            where: { id: st.topping.ingredient_id },
          });
          if (!ingredient) continue;

          const currentQty = Number(ingredient.current_stock) || 0;
          const newQty = currentQty + ingredientRequired;

          await tx.product.update({
            where: { id: st.topping.ingredient_id },
            data: { current_stock: newQty },
          });

          await tx.stockMovement.create({
            data: {
              product_id: st.topping.ingredient_id,
              movement_type: "return",
              direction: "in",
              quantity_before: currentQty,
              quantity_change: ingredientRequired,
              quantity_after: newQty,
              reference_type: "sale",
              reference_id: sale.id,
              reason_code: "sale_void",
              reason_text: `คืนวัตถุดิบ topping จากการยกเลิกการขาย: ${sale.sale_number}`,
              created_by: createdBy || "",
            },
          });
        }
      }

      // Release the promotion redemption, if one was used, so a voided sale
      // doesn't permanently consume the code's usage limit.
      if (sale.promotion_id) {
        await tx.promotion.update({
          where: { id: sale.promotion_id },
          data: { used_count: { decrement: 1 } },
        });
      }

      return tx.sale.update({
        where: { id },
        data: { status: "cancelled" },
      });
    });

    return NextResponse.json(cancelledSale);
  } catch (error) {
    console.error("Error voiding sale:", error);
    const message = error instanceof Error ? error.message : "Failed to void sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
