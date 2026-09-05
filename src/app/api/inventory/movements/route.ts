import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission, requireWarehouseAccess } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const warehouseId = searchParams.get("warehouseId");
    const movementType = searchParams.get("movement_type");
    const direction = searchParams.get("direction");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams, 20);

    if (warehouseId) {
      const deniedWarehouse = requireWarehouseAccess(session, warehouseId);
      if (deniedWarehouse) return deniedWarehouse;
    }

    const where: Prisma.StockMovementWhereInput = {};

    // A specific branch scopes to it; omitting the param must still scope
    // to every branch this user is assigned to — previously this endpoint
    // had no warehouse filter at all, so any inventory.view holder
    // (including the cashier role) could see every branch's stock
    // movements — sale deductions, adjustments, transfers, void-restores —
    // system-wide.
    //
    // Defense-in-depth on top of that: StockMovement.warehouse_id has no
    // defined Prisma relation to Warehouse (see the reference_id comment
    // below), so unlike Sale/PaymentIntent/StockTransfer we can't nest a
    // `warehouse: { shop_id }` filter directly. Instead, resolve the
    // warehouse ids in scope down to only those that also belong to the
    // caller's own shop, and filter on that explicitly-verified list.
    const scopedWarehouses = await prisma.warehouse.findMany({
      where: {
        shop_id: session!.user.shop_id!,
        id: warehouseId ? warehouseId : { in: session?.user?.warehouse_ids ?? [] },
      },
      select: { id: true },
    });
    where.warehouse_id = { in: scopedWarehouses.map((w) => w.id) };

    if (productId) {
      // A SEMI_FINISHED ("ปรุง"/recipe) product never gets its own
      // StockMovement rows on sale — deductStock() in create-sale.ts
      // deducts its recipe's ingredients instead (see the comment there).
      // Filtering strictly on product_id for one of these would always
      // come back empty even right after a sale, which reads as "the sale
      // never happened" rather than "this product doesn't hold its own
      // stock". So for a SEMI_FINISHED product, also pull in whichever
      // ingredient movements were caused by THIS product's own sale items
      // — reference_type "sale_item" + reference_id pointing at one of
      // this product's SaleItem rows (set by createCompletedSale, the void
      // handler, and the refund handler). Movements that touch the
      // product's own stock directly (production, manual adjustment,
      // transfer, count) still match via product_id as before.
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { product_type: { select: { type: true } } },
      });

      if (product?.product_type.type === PRODUCTS_TYPES.SEMI_FINISHED) {
        const saleItems = await prisma.saleItem.findMany({
          where: { product_id: productId },
          select: { id: true },
        });
        const saleItemIds = saleItems.map((si) => si.id);

        where.OR = [
          { product_id: productId },
          ...(saleItemIds.length > 0
            ? [{ reference_type: "sale_item", reference_id: { in: saleItemIds } }]
            : []),
        ];
      } else {
        where.product_id = productId;
      }
    }

    if (movementType) {
      where.movement_type = movementType;
    }

    if (direction) {
      where.direction = direction;
    }

    // Bare "yyyy-MM-dd" strings — parsed with no "Z" so JS treats them as
    // the server's own local midnight (Asia/Bangkok), not UTC midnight
    // (~7h off from the real local day boundary). Upper bound is exclusive
    // (start of the next local day), same fix as /api/sales.
    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) {
        where.transaction_date.gte = new Date(`${startDate}T00:00:00`);
      }
      if (endDate) {
        const endExclusive = new Date(`${endDate}T00:00:00`);
        endExclusive.setDate(endExclusive.getDate() + 1);
        where.transaction_date.lt = endExclusive;
      }
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { transaction_date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // StockMovement has no defined Prisma relation for warehouse_id or
    // reference_id (a loose polymorphic reference_type/reference_id pair,
    // not a real FK relation) — resolved here in application code instead
    // of a schema change. Every movement only ever shows the single branch
    // it happened at otherwise; a "transfer" movement specifically needs
    // both sides (from -> to), which only StockTransfer itself records.
    const warehouseIds = [...new Set(movements.map((m) => m.warehouse_id))];
    const transferIds = [
      ...new Set(
        movements
          .filter((m) => m.reference_type === "transfer" && m.reference_id)
          .map((m) => m.reference_id as string),
      ),
    ];
    // A SEMI_FINISHED product's history (above) can mix in rows whose
    // product_id is actually one of its recipe's ingredients, not the
    // product being viewed — the client needs each row's own product
    // name/unit to label those correctly instead of assuming every row is
    // about the product it opened the modal for.
    const productIds = [...new Set(movements.map((m) => m.product_id))];

    const [movementWarehouses, transfers, products] = await Promise.all([
      prisma.warehouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, code: true, name_i18n: true },
      }),
      transferIds.length > 0
        ? prisma.stockTransfer.findMany({
            where: { id: { in: transferIds } },
            select: {
              id: true,
              from_warehouse: { select: { id: true, code: true, name_i18n: true } },
              to_warehouse: { select: { id: true, code: true, name_i18n: true } },
            },
          })
        : Promise.resolve([]),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          code: true,
          name_i18n: true,
          base_unit: { select: { abbreviation_i18n: true } },
        },
      }),
    ]);
    const warehouseById = new Map(movementWarehouses.map((w) => [w.id, w]));
    const transferById = new Map(transfers.map((t) => [t.id, t]));
    const productById = new Map(products.map((p) => [p.id, p]));

    const items = movements.map((movement) => ({
      ...movement,
      warehouse: warehouseById.get(movement.warehouse_id) ?? null,
      transfer:
        movement.reference_type === "transfer" && movement.reference_id
          ? transferById.get(movement.reference_id) ?? null
          : null,
      product: productById.get(movement.product_id) ?? null,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
