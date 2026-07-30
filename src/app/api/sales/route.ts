import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import {
  requirePermission,
  requireWarehouseAccess,
  assertWarehouseAccessLive,
} from "@/lib/permissions";
import { getLocale, getTranslations } from "next-intl/server";
import { Prisma } from "@prisma/client";
import type { Locale } from "@/types/i18n";
import { createCompletedSale, SaleCreationError } from "@/lib/sales/create-sale";

// GET /api/sales - Get all sales with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.view");
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const searchQuery = searchParams.get("searchQuery") || "";
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const warehouseId = searchParams.get("warehouseId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (warehouseId) {
      const deniedWarehouse = requireWarehouseAccess(session, warehouseId);
      if (deniedWarehouse) return deniedWarehouse;
    }

    // A specific branch scopes to it; omitting the param must still scope
    // to every branch *this user* is assigned to — not literally every
    // warehouse in the system. Without this, any sales.view holder could
    // see every branch's sales (payment status, items, refunds) just by
    // calling the API without a warehouseId, bypassing the UI's own filter.
    // Same idiom as dashboard/stats/route.ts.
    const warehouseIdFilter: Prisma.StringFilter | string = warehouseId
      ? warehouseId
      : { in: session?.user?.warehouse_ids ?? [] };

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.SaleWhereInput = {};

    if (searchQuery) {
      where.sale_number = { contains: searchQuery, mode: "insensitive" };
    }

    // status/status is now a real Prisma enum (SaleStatus/PaymentStatus) —
    // a query param is just a string until validated against the same
    // allow-list PUT /api/sales/[id] uses, so a bad value here is a clean
    // 400 instead of Prisma's own runtime enum-validation error.
    if (status) {
      if (status !== "completed" && status !== "cancelled") {
        return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
      }
      where.status = status;
    }

    if (paymentStatus) {
      if (paymentStatus !== "paid" && paymentStatus !== "unpaid") {
        return NextResponse.json(
          { error: `Invalid paymentStatus: ${paymentStatus}` },
          { status: 400 },
        );
      }
      where.payment_status = paymentStatus;
    }

    where.warehouse_id = warehouseIdFilter;

    // startDate/endDate arrive as bare "yyyy-MM-dd" (see DateField, which
    // never adds a time or offset) — appending "T00:00:00" with no "Z"
    // makes JS parse it as the server's own local midnight (Asia/Bangkok)
    // instead of UTC midnight, which was ~7h off from the actual local day
    // boundary. The upper bound is exclusive (start of the *next* local
    // day), not `lte` on the end date's own midnight, which used to cut
    // off nearly the entire end day.
    if (startDate || endDate) {
      where.sale_date = {};
      if (startDate) {
        where.sale_date.gte = new Date(`${startDate}T00:00:00`);
      }
      if (endDate) {
        const endExclusive = new Date(`${endDate}T00:00:00`);
        endExclusive.setDate(endExclusive.getDate() + 1);
        where.sale_date.lt = endExclusive;
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          warehouse: true,
          created_by_user: {
            select: {
              id: true,
              full_name: true,
            },
          },
          promotion: { select: { id: true, code: true, name_i18n: true } },
          items: {
            include: {
              product: {
                include: {
                  product_type: true,
                  base_unit: true,
                },
              },
              recipe: true,
              toppings: {
                include: {
                  topping: { select: { id: true, name_i18n: true } },
                },
              },
              refund_items: true,
            },
          },
          refunds: { include: { items: true }, orderBy: { created_at: "desc" } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      items: sales,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch sale";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/sales - Create a new sale
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.create");
    if (denied) return denied;

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations({ locale, namespace: "sales.errors" });
    const tPromo = await getTranslations({
      locale,
      namespace: "promotions.errors",
    });

    const body = await request.json();
    const { warehouse_id, items, idempotency_key } = body;

    if (!warehouse_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Warehouse and items are required" },
        { status: 400 },
      );
    }

    const deniedWarehouse = await assertWarehouseAccessLive(
      session,
      warehouse_id,
    );
    if (deniedWarehouse) return deniedWarehouse;

    const { sale, isNew } = await createCompletedSale(
      body,
      idempotency_key || null,
      { locale, t, tPromo, createdBy: session?.user?.id || null },
    );

    return NextResponse.json(sale, { status: isNew ? 201 : 200 });
  } catch (error) {
    if (error instanceof SaleCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating sale:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create sale";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
