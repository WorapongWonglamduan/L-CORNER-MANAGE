import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

// GET /api/warehouses - ดึงรายการคลังสินค้า
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const isActive = searchParams.get("isActive");

    const where: Prisma.WarehouseWhereInput = {};

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.warehouse.count({ where }),
    ]);

    return NextResponse.json({
      items: warehouses,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

// POST /api/warehouses - สร้างคลังสินค้าใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, name_i18n, address, is_active = true } = body;

    if (!code || !name_i18n) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name_i18n,
        address,
        is_active,
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create warehouse";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
