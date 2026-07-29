import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const movementType = searchParams.get("movement_type");
    const direction = searchParams.get("direction");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    interface WhereClause {
      product_id?: string;
      movement_type?: string;
      direction?: string;
      transaction_date?: {
        gte?: Date;
        lt?: Date;
      };
    }

    const where: WhereClause = {};

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

    return NextResponse.json({
      items: movements,
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
