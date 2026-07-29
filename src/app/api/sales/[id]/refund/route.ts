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

// Same local-day-boundary fix as generateSaleNumber() in ../../route.ts —
// format() reads the Date's local getters, not toISOString()'s UTC ones.
async function generateRefundNumber(): Promise<string> {
  const dateStr = format(new Date(), "yyyyMMdd");
  const lastRefund = await prisma.saleRefund.findFirst({
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
    const items: RefundItemInput[] = Array.isArray(body.items) ? body.items : [];
    const reason: string | null = body.reason || null;

    if (items.length === 0) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { product_type: true } },
            toppings: { include: { topping: { include: { ingredient: true } } } },
            refund_items: true,
          },
        },
      },
    });

    if (!sale) {
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

    // Validate every requested line before touching anything — a shortage
    // partway through must never leave a partial refund.
    const resolved: {
      saleItem: (typeof sale.items)[number];
      quantity: number;
      amount: number;
    }[] = [];

    for (const req of items) {
      const quantity = Number(req.quantity);
      if (!(quantity > 0)) {
        return NextResponse.json(
          { error: `Invalid refund quantity for ${req.sale_item_id}: ${req.quantity}` },
          { status: 400 },
        );
      }

      const saleItem = sale.items.find((i) => i.id === req.sale_item_id);
      if (!saleItem) {
        return NextResponse.json(
          { error: `Sale item not found on this sale: ${req.sale_item_id}` },
          { status: 404 },
        );
      }

      const alreadyRefunded = saleItem.refund_items.reduce(
        (sum, ri) => sum + Number(ri.quantity),
        0,
      );
      const originalQty = Number(saleItem.quantity);
      const remaining = originalQty - alreadyRefunded;
      if (quantity > remaining) {
        return NextResponse.json(
          {
            error: `Cannot refund ${quantity} of "${saleItem.id}" — only ${remaining} of ${originalQty} remain refundable`,
          },
          { status: 400 },
        );
      }

      // Proportional to what this item actually charged per unit (already
      // includes its toppings' share and any applied discount), not the
      // product's current selling_price — a later price change must never
      // change what a past sale's refund is worth.
      const unitAmount = Number(saleItem.total_amount) / originalQty;
      resolved.push({ saleItem, quantity, amount: unitAmount * quantity });
    }

    const refund = await prisma.$transaction(async (tx) => {
      const refundNumber = await generateRefundNumber();
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
                reference_type: "sale_refund",
                reference_id: created.id,
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
                  reference_type: "sale_refund",
                  reference_id: created.id,
                  reason_code: "sale_refund",
                  reason_text: `คืนวัตถุดิบจากการคืนสินค้า: ${sale.sale_number}`,
                  created_by: createdBy || "",
                },
              });
            }
          }
        }

        // Toppings scale with however much of this line is being refunded,
        // not the item's full original quantity.
        const refundRatio = quantity / originalQty;
        for (const st of saleItem.toppings) {
          // Mirrors deductToppingStock()'s own check in ../../route.ts — if
          // this ingredient's stock was never deducted at sale time because
          // track_stock was off, restoring it here would add stock that was
          // never actually subtracted.
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
              reference_type: "sale_refund",
              reference_id: created.id,
              reason_code: "sale_refund",
              reason_text: `คืนวัตถุดิบ topping จากการคืนสินค้า: ${sale.sale_number}`,
              created_by: createdBy || "",
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json(refund, { status: 201 });
  } catch (error) {
    console.error("Error creating refund:", error);
    const message = error instanceof Error ? error.message : "Failed to create refund";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
