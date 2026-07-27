import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
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
    const search = searchParams.get("search") || "";

    const where: Prisma.WarehouseWhereInput = {};

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        orderBy: [{ is_default: "desc" }, { code: "asc" }],
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
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const body = await request.json();
    const {
      code,
      name_i18n,
      address,
      latitude = null,
      longitude = null,
      is_active = true,
      is_default = false,
    } = body;

    if (!code || !name_i18n) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.warehouse.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Warehouse code already exists" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.$transaction(async (tx) => {
      if (is_default) {
        await tx.warehouse.updateMany({
          where: { is_default: true },
          data: { is_default: false },
        });
      }
      return tx.warehouse.create({
        data: {
          code,
          name_i18n,
          address,
          latitude,
          longitude,
          is_active,
          is_default,
        },
      });
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
