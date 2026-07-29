import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, requireWarehouseAccess, assertWarehouseAccessLive } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { Prisma } from "@prisma/client";

// Thrown for validation failures discovered *inside* the void transaction
// (see the isolation-level comment on DELETE below) — caught outside and
// turned into the right HTTP response, since a $transaction callback can
// only abort by throwing.
class VoidError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const MAX_SERIALIZATION_RETRIES = 5;

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
            refund_items: true,
          },
        },
        refunds: { include: { items: true }, orderBy: { created_at: "desc" } },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // A sale's own id is opaque and guessable/enumerable in sequence
    // (sale_number is sequential), so without this a user with sales.view
    // but no assignment to this sale's branch could still fetch its full
    // detail directly by id, bypassing the branch scoping applied to the
    // list endpoint.
    const deniedWarehouse = requireWarehouseAccess(session, sale.warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

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

    // Untyped String columns (not Prisma enums) — allow-list here since
    // nothing else stands between this request body and the DB row.
    const VALID_PAYMENT_STATUSES = ["paid", "unpaid"];
    const VALID_STATUSES = ["completed", "cancelled"];
    if (payment_status !== undefined && !VALID_PAYMENT_STATUSES.includes(payment_status)) {
      return NextResponse.json(
        { error: `Invalid payment_status: ${payment_status}` },
        { status: 400 },
      );
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 },
      );
    }

    // This previously went straight to update() with no existence check
    // and no branch-ownership check — a sales.void holder assigned only to
    // Branch A could edit payment_status/status on a Branch B sale just by
    // knowing its id.
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      select: { warehouse_id: true },
    });
    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    const deniedWarehouse = await assertWarehouseAccessLive(session, existingSale.warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

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

    // Checked once upfront, not inside the retry loop below — a sale's
    // warehouse_id never changes after creation, so unlike status/refunds
    // there's nothing here for a concurrent request to invalidate. Without
    // this, a sales.void holder assigned only to Branch A could cancel a
    // Branch B sale (and restore its stock there) just by knowing its id.
    const saleForAccessCheck = await prisma.sale.findUnique({
      where: { id },
      select: { warehouse_id: true },
    });
    if (!saleForAccessCheck) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    const deniedWarehouse = await assertWarehouseAccessLive(
      session,
      saleForAccessCheck.warehouse_id,
    );
    if (deniedWarehouse) return deniedWarehouse;

    // Serializable + retry-on-conflict (same idiom as the refund route's
    // POST handler): everything that decides whether this void is allowed
    // — existence, current status, whether a refund already exists — is
    // re-read *inside* the transaction below instead of once up front.
    // Read Committed would let two concurrent void requests (double-click,
    // two tabs) both read "completed, no refunds" before either commits,
    // and both would restore stock — double-crediting it. Serializable
    // makes Postgres detect that overlap itself and abort one side
    // (surfaced by Prisma as P2034) instead of silently letting both
    // through. It also closes the mirror-image race against a concurrent
    // refund, since both transactions touch the same sale/sale-item rows.
    for (let attempt = 1; ; attempt++) {
      try {
        const cancelledSale = await prisma.$transaction(
          async (tx) => {
            const sale = await tx.sale.findUnique({
              where: { id },
              include: {
                items: {
                  include: {
                    product: { include: { product_type: true } },
                    toppings: { include: { topping: true } },
                  },
                },
                refunds: { select: { id: true } },
              },
            });

            if (!sale) {
              throw new VoidError("Sale not found", 404);
            }

            if (sale.status === "cancelled") {
              throw new VoidError("Sale is already cancelled", 400);
            }

            // Voiding restores stock for each item's *full* original
            // quantity (below) — it has no idea some of that quantity was
            // already restored by an earlier (or concurrently-committing)
            // refund. Without this check, voiding a refunded sale would
            // double-restore whatever was already refunded. Simplest
            // correct rule: once any refund exists against a sale, it can
            // no longer be voided outright — refund whatever's left
            // instead.
            if (sale.refunds.length > 0) {
              throw new VoidError(
                "Cannot void a sale that already has refunds — refund the remaining items instead of voiding the whole sale",
                400,
              );
            }

            const warehouseId = sale.warehouse_id;

            // Restores `amount` to a product's ProductStock row at this
            // sale's warehouse (creating the row if it doesn't exist yet),
            // mirroring deductProductStock() in sales/route.ts in reverse.
            const restoreProductStock = async (productId: string, amount: number) => {
              const existing = await tx.productStock.findUnique({
                where: {
                  product_id_warehouse_id: { product_id: productId, warehouse_id: warehouseId },
                },
              });
              const currentQty = Number(existing?.current_stock) || 0;
              const newQty = currentQty + amount;

              await tx.productStock.upsert({
                where: {
                  product_id_warehouse_id: { product_id: productId, warehouse_id: warehouseId },
                },
                create: { product_id: productId, warehouse_id: warehouseId, current_stock: newQty },
                update: { current_stock: newQty },
              });

              return { currentQty, newQty };
            };

            // Restore stock for every item, mirroring deductStock() in reverse.
            for (const item of sale.items) {
              const quantity = Number(item.base_quantity ?? item.quantity);
              const productType = item.product.product_type.type;

              if (productType !== PRODUCTS_TYPES.SEMI_FINISHED) {
                const { currentQty, newQty } = await restoreProductStock(
                  item.product_id,
                  quantity,
                );

                await tx.stockMovement.create({
                  data: {
                    product_id: item.product_id,
                    warehouse_id: warehouseId,
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
                  const { currentQty, newQty } = await restoreProductStock(
                    ri.ingredient_id,
                    ingredientQty,
                  );

                  await tx.stockMovement.create({
                    data: {
                      product_id: ri.ingredient_id,
                      warehouse_id: warehouseId,
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

                const { currentQty, newQty } = await restoreProductStock(
                  st.topping.ingredient_id,
                  ingredientRequired,
                );

                await tx.stockMovement.create({
                  data: {
                    product_id: st.topping.ingredient_id,
                    warehouse_id: warehouseId,
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
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return NextResponse.json(cancelledSale);
      } catch (error) {
        if (error instanceof VoidError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        const isWriteConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (isWriteConflict && attempt < MAX_SERIALIZATION_RETRIES) continue;
        throw error;
      }
    }
  } catch (error) {
    console.error("Error voiding sale:", error);
    const message = error instanceof Error ? error.message : "Failed to void sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
