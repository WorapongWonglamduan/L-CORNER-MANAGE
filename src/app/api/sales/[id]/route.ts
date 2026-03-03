import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Get sale by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
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
                base_unit: true,
              },
            },
            product_unit: {
              include: {
                unit: true,
              },
            },
            recipe: {
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
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sale" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel sale (soft delete) and restore stock
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                product_type: true,
                recipes: {
                  where: { is_default: true, is_active: true },
                  include: {
                    ingredients: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status === "cancelled") {
      return NextResponse.json(
        { error: "Sale already cancelled" },
        { status: 400 }
      );
    }

    // Restore stock in transaction
    await prisma.$transaction(async (tx) => {
      // Update sale status
      await tx.sale.update({
        where: { id: params.id },
        data: { status: "cancelled" },
      });

      // Restore stock for each item
      for (const item of sale.items) {
        const productType = item.product.product_type.type;

        // FINISHED_GOOD: Restore stock to the product itself
        if (productType === "finished_good") {
          const currentStock = await tx.stock.findUnique({
            where: {
              product_id_warehouse_id: {
                product_id: item.product_id,
                warehouse_id: sale.warehouse_id,
              },
            },
          });

          const currentQty = currentStock?.quantity || 0;
          const newQty = Number(currentQty) + Number(item.base_quantity);

          await tx.stock.upsert({
            where: {
              product_id_warehouse_id: {
                product_id: item.product_id,
                warehouse_id: sale.warehouse_id,
              },
            },
            update: { quantity: newQty },
            create: {
              product_id: item.product_id,
              warehouse_id: sale.warehouse_id,
              quantity: newQty,
            },
          });

          await tx.product.update({
            where: { id: item.product_id },
            data: { current_stock: newQty },
          });

          await tx.stockTransaction.create({
            data: {
              product_id: item.product_id,
              warehouse_id: sale.warehouse_id,
              transaction_type: "sale_cancel",
              quantity: Number(item.base_quantity),
              quantity_before: currentQty,
              quantity_after: newQty,
              reference_id: sale.id,
              reference_type: "sale_cancel",
              note: `ยกเลิกการขาย ${sale.sale_number}`,
              created_by: session.user?.id,
            },
          });
        }
        // SEMI_FINISHED: Restore stock to ingredients
        else if (productType === "semi_finished") {
          const defaultRecipe = item.product.recipes[0];

          if (defaultRecipe) {
            for (const recipeIngredient of defaultRecipe.ingredients) {
              const ingredientQty =
                Number(recipeIngredient.quantity) * Number(item.quantity);

              const currentStock = await tx.stock.findUnique({
                where: {
                  product_id_warehouse_id: {
                    product_id: recipeIngredient.ingredient_id,
                    warehouse_id: sale.warehouse_id,
                  },
                },
              });

              const currentQty = currentStock?.quantity || 0;
              const newQty = Number(currentQty) + ingredientQty;

              await tx.stock.upsert({
                where: {
                  product_id_warehouse_id: {
                    product_id: recipeIngredient.ingredient_id,
                    warehouse_id: sale.warehouse_id,
                  },
                },
                update: { quantity: newQty },
                create: {
                  product_id: recipeIngredient.ingredient_id,
                  warehouse_id: sale.warehouse_id,
                  quantity: newQty,
                },
              });

              await tx.product.update({
                where: { id: recipeIngredient.ingredient_id },
                data: { current_stock: newQty },
              });

              await tx.stockTransaction.create({
                data: {
                  product_id: recipeIngredient.ingredient_id,
                  warehouse_id: sale.warehouse_id,
                  transaction_type: "sale_cancel",
                  quantity: ingredientQty,
                  quantity_before: currentQty,
                  quantity_after: newQty,
                  unit_id: recipeIngredient.unit_id,
                  quantity_in_unit: ingredientQty,
                  reference_id: sale.id,
                  reference_type: "sale_cancel",
                  note: `ยกเลิกการขาย ${sale.sale_number} - คืนวัตถุดิบ`,
                  created_by: session.user?.id,
                },
              });
            }
          }
        }
      }
    });

    return NextResponse.json({ message: "Sale cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel sale" },
      { status: 500 }
    );
  }
}
