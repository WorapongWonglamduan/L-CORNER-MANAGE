import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, assertWarehouseAccessLive } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

type TransactionClient = Prisma.TransactionClient;

interface RefundItemInput {
  sale_item_id: string;
  quantity: number;
}

// Thrown for validation failures discovered *inside* the transaction (see
// the isolation-level comment below on why the check has to live there) —
// caught in the outer handler and turned into the right HTTP response,
// since throwing is how a $transaction callback aborts/rolls back.
class RefundError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Same local-day-boundary fix as generateSaleNumber() in ../../route.ts —
// format() reads the Date's local getters, not toISOString()'s UTC ones.
async function generateRefundNumber(tx: TransactionClient): Promise<string> {
  const dateStr = format(new Date(), "yyyyMMdd");
  const lastRefund = await tx.saleRefund.findFirst({
    where: { refund_number: { startsWith: `REF-${dateStr}` } },
    orderBy: { refund_number: "desc" },
  });

  if (!lastRefund) return `REF-${dateStr}-0001`;
  const lastNumber = parseInt(lastRefund.refund_number.split("-")[2]);
  return `REF-${dateStr}-${(lastNumber + 1).toString().padStart(4, "0")}`;
}

// Restores `amount` to a product's stock at `warehouseId`, mirroring
// deductProductStock() in ../../route.ts in reverse (upsert-then-increment,
// same as the DELETE/void handler's restoreProductStock).
async function restoreProductStock(
  tx: TransactionClient,
  productId: string,
  warehouseId: string,
  amount: number,
) {
  const existing = await tx.productStock.findUnique({
    where: { product_id_warehouse_id: { product_id: productId, warehouse_id: warehouseId } },
  });
  const currentQty = Number(existing?.current_stock) || 0;
  const newQty = currentQty + amount;

  await tx.productStock.upsert({
    where: { product_id_warehouse_id: { product_id: productId, warehouse_id: warehouseId } },
    create: { product_id: productId, warehouse_id: warehouseId, current_stock: newQty },
    update: { current_stock: newQty },
  });

  return { currentQty, newQty };
}

const MAX_SERIALIZATION_RETRIES = 5;

// POST /api/sales/[id]/refund - partial or full refund of specific line
// items (and quantities within them) from a completed sale. Distinct from
// DELETE /api/sales/[id] (void), which cancels the whole sale — this can
// return e.g. 1 of 5 units sold, leaving the rest of the sale intact.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.refund");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const rawItems: RefundItemInput[] = Array.isArray(body.items) ? body.items : [];
    const reason: string | null = body.reason || null;

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
    }
    for (const req of rawItems) {
      if (!(Number(req.quantity) > 0)) {
        return NextResponse.json(
          { error: `Invalid refund quantity for ${req.sale_item_id}: ${req.quantity}` },
          { status: 400 },
        );
      }
    }

    // Collapse duplicate sale_item_id entries into one summed quantity —
    // the remaining-quantity check below only reads each SaleItem's
    // already-refunded total ONCE per transaction attempt, so two entries
    // for the same sale_item_id in a single request would otherwise both
    // independently pass against that same stale "remaining" figure and
    // over-refund/over-restore stock beyond what was ever sold.
    const items: RefundItemInput[] = Array.from(
      rawItems.reduce((map, req) => {
        map.set(req.sale_item_id, (map.get(req.sale_item_id) || 0) + Number(req.quantity));
        return map;
      }, new Map<string, number>()),
    ).map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }));

    // Existence/warehouse-access are checked once upfront — they don't
    // change based on a concurrent request. `status`, however, DOES: a
    // concurrent void can flip it, so it's re-checked inside the
    // transaction below instead of trusted from here.
    const sale = await prisma.sale.findUnique({
      where: { id },
      select: {
        id: true,
        sale_number: true,
        status: true,
        warehouse_id: true,
        promotion_id: true,
        warehouse: { select: { shop_id: true } },
      },
    });
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    // Defense-in-depth: same shop-of-warehouse check as the other
    // sales/[id] routes, checked before the status/warehouse-access checks
    // below so a cross-tenant id doesn't leak anything about its own state.
    if (sale.warehouse.shop_id !== session!.user.shop_id) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    if (sale.status !== "completed") {
      return NextResponse.json(
        { error: `Cannot refund a sale with status "${sale.status}"` },
        { status: 400 },
      );
    }
    const deniedWarehouse = await assertWarehouseAccessLive(session, sale.warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

    const createdBy = session?.user?.id || null;
    const warehouseId = sale.warehouse_id;

    // Serializable + retry-on-conflict (same idiom as generateSaleNumber's
    // retry loop in ../../route.ts) rather than Prisma's default Read
    // Committed: two refund requests for the *same* sale item, submitted at
    // the same moment, would otherwise both read "X remaining" before
    // either commits and both pass validation — over-refunding beyond what
    // was ever sold. Serializable makes Postgres itself detect that
    // conflict and abort one side (Prisma surfaces it as P2034) instead of
    // silently letting both through.
    for (let attempt = 1; ; attempt++) {
      try {
        const refund = await prisma.$transaction(
          async (tx) => {
            // Re-checked inside the transaction: a concurrent void could
            // have flipped this sale to "cancelled" between the upfront
            // check above and this attempt actually committing. Voiding
            // restores stock for every item's full quantity with no idea a
            // refund might land on top of that — so refunding a sale that a
            // concurrent void just cancelled would double-restore stock and
            // leave the sale in an inconsistent cancelled-but-refunded
            // state. This re-read participates in the same Serializable
            // transaction as the void's own checks, so it either sees the
            // committed cancellation or gets a conflict and retries.
            const liveSale = await tx.sale.findUnique({
              where: { id: sale.id },
              select: { status: true },
            });
            if (!liveSale || liveSale.status !== "completed") {
              throw new RefundError(
                `Cannot refund a sale with status "${liveSale?.status ?? "not found"}"`,
                400,
              );
            }

            // Re-read inside the transaction, not reused from before it —
            // the whole point of Serializable here is that this has to be
            // the value Postgres will actually conflict-check against.
            const saleItems = await tx.saleItem.findMany({
              where: { sale_id: sale.id },
              include: {
                product: { include: { product_type: true } },
                toppings: { include: { topping: { include: { ingredient: true } } } },
                refund_items: true,
              },
            });

            const resolved: {
              saleItem: (typeof saleItems)[number];
              quantity: number;
              amount: number;
            }[] = [];

            for (const req of items) {
              const quantity = Number(req.quantity);
              const saleItem = saleItems.find((i) => i.id === req.sale_item_id);
              if (!saleItem) {
                throw new RefundError(
                  `Sale item not found on this sale: ${req.sale_item_id}`,
                  404,
                );
              }

              const alreadyRefunded = saleItem.refund_items.reduce(
                (sum, ri) => sum + Number(ri.quantity),
                0,
              );
              const originalQty = Number(saleItem.quantity);
              const remaining = originalQty - alreadyRefunded;
              if (quantity > remaining) {
                throw new RefundError(
                  `Cannot refund ${quantity} of "${saleItem.id}" — only ${remaining} of ${originalQty} remain refundable`,
                  400,
                );
              }

              // Proportional to what this item actually charged per unit
              // (already includes its toppings' share and any applied
              // discount), not the product's current selling_price — a
              // later price change must never change what a past sale's
              // refund is worth.
              const unitAmount = Number(saleItem.total_amount) / originalQty;
              resolved.push({ saleItem, quantity, amount: unitAmount * quantity });
            }

            // A void releases the promotion redemption it used (see
            // DELETE /api/sales/[id]) so a cancelled sale doesn't
            // permanently consume the code's usage limit — a refund that
            // ends up returning EVERY item's full quantity is the same
            // "customer got everything back" outcome and must release it
            // too, or a max_uses:1 code becomes permanently unusable the
            // moment a fully-refunded sale is processed as a refund instead
            // of a void. A partial refund (some quantity still kept) does
            // NOT release it — the discount still applied to what's kept.
            const isFullyRefundedAfterThis = saleItems.every((si) => {
              const existingRefunded = si.refund_items.reduce(
                (sum, ri) => sum + Number(ri.quantity),
                0,
              );
              const thisRequest = resolved.find((r) => r.saleItem.id === si.id)?.quantity ?? 0;
              return existingRefunded + thisRequest >= Number(si.quantity);
            });
            if (isFullyRefundedAfterThis && sale.promotion_id) {
              await tx.promotion.update({
                where: { id: sale.promotion_id },
                data: { used_count: { decrement: 1 } },
              });
            }

            const refundNumber = await generateRefundNumber(tx);
            const totalAmount = resolved.reduce((sum, r) => sum + r.amount, 0);

            const created = await tx.saleRefund.create({
              data: {
                sale_id: sale.id,
                refund_number: refundNumber,
                total_amount: totalAmount,
                reason,
                created_by: createdBy,
                items: {
                  create: resolved.map((r) => ({
                    sale_item_id: r.saleItem.id,
                    quantity: r.quantity,
                    amount: r.amount,
                  })),
                },
              },
              include: { items: true },
            });

            for (const { saleItem, quantity } of resolved) {
              const originalQty = Number(saleItem.quantity);
              const productType = saleItem.product.product_type.type;

              if (productType !== PRODUCTS_TYPES.SEMI_FINISHED) {
                if (saleItem.product.track_stock) {
                  const { currentQty, newQty } = await restoreProductStock(
                    tx,
                    saleItem.product_id,
                    warehouseId,
                    quantity,
                  );
                  await tx.stockMovement.create({
                    data: {
                      product_id: saleItem.product_id,
                      warehouse_id: warehouseId,
                      movement_type: "return",
                      direction: "in",
                      quantity_before: currentQty,
                      quantity_change: quantity,
                      quantity_after: newQty,
                      // Points at the line item being refunded, not the
                      // refund document — same convention as the original
                      // deduction in createCompletedSale, so a shared
                      // ingredient's history stays attributable per item.
                      reference_type: "sale_item",
                      reference_id: saleItem.id,
                      reason_code: "sale_refund",
                      reason_text: `คืนสินค้าจากการขาย: ${sale.sale_number}`,
                      created_by: createdBy || "",
                    },
                  });
                }
              } else {
                const recipe = await tx.recipe.findFirst({
                  where: { product_id: saleItem.product_id, is_default: true, is_active: true },
                });
                if (recipe) {
                  const recipeIngredients = await tx.recipeIngredient.findMany({
                    where: { recipe_id: recipe.id },
                    include: { ingredient: true },
                  });
                  for (const ri of recipeIngredients) {
                    if (!ri.ingredient.track_stock) continue;
                    const ingredientQty = Number(ri.quantity) * quantity;
                    const { currentQty, newQty } = await restoreProductStock(
                      tx,
                      ri.ingredient_id,
                      warehouseId,
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
                        reference_type: "sale_item",
                        reference_id: saleItem.id,
                        reason_code: "sale_refund",
                        reason_text: `คืนวัตถุดิบจากการคืนสินค้า: ${sale.sale_number}`,
                        created_by: createdBy || "",
                      },
                    });
                  }
                }
              }

              // Toppings scale with however much of this line is being
              // refunded, not the item's full original quantity.
              const refundRatio = quantity / originalQty;
              for (const st of saleItem.toppings) {
                // Mirrors deductToppingStock()'s own check in ../../route.ts
                // — if this ingredient's stock was never deducted at sale
                // time because track_stock was off, restoring it here would
                // add stock that was never actually subtracted.
                if (!st.topping.ingredient.track_stock) continue;
                const ingredientRequired =
                  Number(st.topping.quantity_per_serving) * Number(st.quantity) * refundRatio;
                if (ingredientRequired <= 0) continue;

                const { currentQty, newQty } = await restoreProductStock(
                  tx,
                  st.topping.ingredient_id,
                  warehouseId,
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
                    reference_type: "sale_item",
                    reference_id: saleItem.id,
                    reason_code: "sale_refund",
                    reason_text: `คืนวัตถุดิบ topping จากการคืนสินค้า: ${sale.sale_number}`,
                    created_by: createdBy || "",
                  },
                });
              }
            }

            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return NextResponse.json(refund, { status: 201 });
      } catch (error) {
        if (error instanceof RefundError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        const isWriteConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (isWriteConflict && attempt < MAX_SERIALIZATION_RETRIES) continue;
        throw error;
      }
    }
  } catch (error) {
    console.error("Error creating refund:", error);
    const message = error instanceof Error ? error.message : "Failed to create refund";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
