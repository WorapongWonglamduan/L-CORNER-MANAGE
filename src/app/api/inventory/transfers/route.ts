import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  requirePermission,
  requireWarehouseAccess,
  assertWarehouseAccessLive,
} from "@/lib/permissions";
import { Prisma } from "@prisma/client";

// GET /api/inventory/transfers - รายการย้ายสินค้าระหว่างคลัง
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");

    if (warehouseId) {
      const deniedWarehouse = requireWarehouseAccess(session, warehouseId);
      if (deniedWarehouse) return deniedWarehouse;
    }

    const where: Prisma.StockTransferWhereInput = {};

    if (warehouseId) {
      where.OR = [
        { from_warehouse_id: warehouseId },
        { to_warehouse_id: warehouseId },
      ];
    }

    if (productId) {
      where.product_id = productId;
    }

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          from_warehouse: { select: { id: true, code: true, name_i18n: true } },
          to_warehouse: { select: { id: true, code: true, name_i18n: true } },
          product: { select: { id: true, code: true, name_i18n: true } },
          created_by_user: { select: { id: true, full_name: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return NextResponse.json({
      items: transfers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching stock transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock transfers" },
      { status: 500 },
    );
  }
}

// POST /api/inventory/transfers - ย้ายสินค้าระหว่างคลัง (ทันที, ไม่มีสถานะระหว่างทาง)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.transfer");
    if (denied) return denied;

    const body = await request.json();
    const { from_warehouse_id, to_warehouse_id, product_id, quantity, note } = body;

    if (!from_warehouse_id || !to_warehouse_id || !product_id || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (from_warehouse_id === to_warehouse_id) {
      return NextResponse.json(
        { error: "Source and destination warehouse must be different" },
        { status: 400 },
      );
    }

    // Both ends of a transfer are restricted to this user's assigned
    // branches — a user shouldn't be able to write stock/movement rows into
    // a branch they otherwise have no visibility into.
    const deniedFrom = await assertWarehouseAccessLive(session, from_warehouse_id);
    if (deniedFrom) return deniedFrom;
    const deniedTo = await assertWarehouseAccessLive(session, to_warehouse_id);
    if (deniedTo) return deniedTo;

    const transferQty = Number(quantity);
    if (!transferQty || transferQty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({ where: { id: product_id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const fromStock = await tx.productStock.findUnique({
        where: {
          product_id_warehouse_id: { product_id, warehouse_id: from_warehouse_id },
        },
      });
      const fromBefore = Number(fromStock?.current_stock) || 0;

      if (fromBefore < transferQty) {
        throw new Error("Insufficient stock at source warehouse");
      }

      const fromAfter = fromBefore - transferQty;
      await tx.productStock.upsert({
        where: {
          product_id_warehouse_id: { product_id, warehouse_id: from_warehouse_id },
        },
        create: { product_id, warehouse_id: from_warehouse_id, current_stock: fromAfter },
        update: { current_stock: fromAfter },
      });

      const toStock = await tx.productStock.findUnique({
        where: {
          product_id_warehouse_id: { product_id, warehouse_id: to_warehouse_id },
        },
      });
      const toBefore = Number(toStock?.current_stock) || 0;
      const toAfter = toBefore + transferQty;

      await tx.productStock.upsert({
        where: {
          product_id_warehouse_id: { product_id, warehouse_id: to_warehouse_id },
        },
        create: { product_id, warehouse_id: to_warehouse_id, current_stock: toAfter },
        update: { current_stock: toAfter },
      });

      const transfer = await tx.stockTransfer.create({
        data: {
          from_warehouse_id,
          to_warehouse_id,
          product_id,
          quantity: transferQty,
          note: note || null,
          created_by: session?.user?.id || null,
        },
      });

      // Paired StockMovement legs at each warehouse for the audit trail.
      await tx.stockMovement.create({
        data: {
          product_id,
          warehouse_id: from_warehouse_id,
          movement_type: "transfer",
          direction: "out",
          quantity_before: fromBefore,
          quantity_change: transferQty,
          quantity_after: fromAfter,
          reference_type: "transfer",
          reference_id: transfer.id,
          reason_code: "transfer_out",
          reason_text: "ย้ายสินค้าออก",
          note: note || null,
          created_by: session?.user?.id || "",
        },
      });

      await tx.stockMovement.create({
        data: {
          product_id,
          warehouse_id: to_warehouse_id,
          movement_type: "transfer",
          direction: "in",
          quantity_before: toBefore,
          quantity_change: transferQty,
          quantity_after: toAfter,
          reference_type: "transfer",
          reference_id: transfer.id,
          reason_code: "transfer_in",
          reason_text: "ย้ายสินค้าเข้า",
          note: note || null,
          created_by: session?.user?.id || "",
        },
      });

      return transfer;
    });

    const completeTransfer = await prisma.stockTransfer.findUnique({
      where: { id: result.id },
      include: {
        from_warehouse: { select: { id: true, code: true, name_i18n: true } },
        to_warehouse: { select: { id: true, code: true, name_i18n: true } },
        product: { select: { id: true, code: true, name_i18n: true } },
        created_by_user: { select: { id: true, full_name: true } },
      },
    });

    return NextResponse.json(completeTransfer, { status: 201 });
  } catch (error) {
    console.error("Error creating stock transfer:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create stock transfer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
