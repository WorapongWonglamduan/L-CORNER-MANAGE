import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, requireWarehouseAccess } from "@/lib/permissions";

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
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (warehouseId) {
      const deniedWarehouse = requireWarehouseAccess(session, warehouseId);
      if (deniedWarehouse) return deniedWarehouse;
    }

    interface WhereClause {
      product_id?: string;
      warehouse_id?: string | { in: string[] };
      movement_type?: string;
      direction?: string;
      transaction_date?: {
        gte?: Date;
        lt?: Date;
      };
    }

    const where: WhereClause = {};

    // A specific branch scopes to it; omitting the param must still scope
    // to every branch this user is assigned to — previously this endpoint
    // had no warehouse filter at all, so any inventory.view holder
    // (including the cashier role) could see every branch's stock
    // movements — sale deductions, adjustments, transfers, void-restores —
    // system-wide.
    where.warehouse_id = warehouseId ? warehouseId : { in: session?.user?.warehouse_ids ?? [] };

    if (productId) {
      where.product_id = productId;
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

    const [movementWarehouses, transfers] = await Promise.all([
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
    ]);
    const warehouseById = new Map(movementWarehouses.map((w) => [w.id, w]));
    const transferById = new Map(transfers.map((t) => [t.id, t]));

    const items = movements.map((movement) => ({
      ...movement,
      warehouse: warehouseById.get(movement.warehouse_id) ?? null,
      transfer:
        movement.reference_type === "transfer" && movement.reference_id
          ? transferById.get(movement.reference_id) ?? null
          : null,
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
