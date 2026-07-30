import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission, hasPermission } from "@/lib/permissions";
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
    const pageSize = parsePageSize(searchParams);
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search") || "";

    const where: Prisma.WarehouseWhereInput = {};

    // Every non-admin caller (POS branch picker, product-form warehouse
    // picker, etc.) already filters the response down to the user's own
    // assigned branches client-side — but the full list, including every
    // branch's address/GPS/promptpay_id, was reaching the browser first.
    // Enforce the same scoping server-side; only settings.view (admin-level)
    // callers, who manage warehouses themselves, get the unrestricted list.
    if (!hasPermission(session, "settings.view")) {
      where.id = { in: session.user.warehouse_ids ?? [] };
    }

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
      { status: 500 },
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
      promptpay_id = null,
      is_active = true,
      is_default = false,
    } = body;

    if (!code || !name_i18n) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.warehouse.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Warehouse code already exists" },
        { status: 400 },
      );
    }

    // Serializable + retry — two admins creating a "default" warehouse at
    // the same moment could otherwise both pass: each transaction's
    // updateMany only clears defaults visible in ITS OWN snapshot, so it
    // never sees the other transaction's brand-new row, and both commit
    // with is_default=true. Same idiom as the refund/void/production/
    // transfer/promotion races fixed elsewhere in this codebase.
    const MAX_RETRIES = 5;
    let warehouse;
    for (let attempt = 1; ; attempt++) {
      try {
        warehouse = await prisma.$transaction(
          async (tx) => {
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
                promptpay_id,
                is_active,
                is_default,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        const isWriteConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (isWriteConflict && attempt < MAX_RETRIES) continue;
        throw error;
      }
    }

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create warehouse";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
