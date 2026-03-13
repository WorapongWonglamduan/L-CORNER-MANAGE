import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        lte?: Date;
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

    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) {
        where.transaction_date.gte = new Date(startDate);
      }
      if (endDate) {
        where.transaction_date.lte = new Date(endDate);
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
