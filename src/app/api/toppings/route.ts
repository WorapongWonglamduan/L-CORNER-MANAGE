import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";

// GET /api/toppings - ดึงรายการ topping ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const productId = searchParams.get("product_id");

    const where: Record<string, unknown> = {};

    if (isActive !== null) {
      where.is_active = isActive === "true";
    }

    if (productId) {
      where.available_on = { some: { product_id: productId } };
    }

    if (search) {
      where.OR = [
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    const total = await prisma.topping.count({ where });

    const toppings = await prisma.topping.findMany({
      where,
      include: {
        ingredient: {
          select: { id: true, code: true, name_i18n: true, stock: true },
        },
        available_on: {
          include: {
            product: { select: { id: true, code: true, name_i18n: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Master data (no warehouse selector here) — sum across all warehouses.
    const items = toppings.map((topping) => ({
      ...topping,
      ingredient: {
        ...topping.ingredient,
        current_stock: topping.ingredient.stock.reduce(
          (sum, s) => sum + Number(s.current_stock),
          0,
        ),
      },
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching toppings:", error);
    return NextResponse.json(
      { error: "Failed to fetch toppings" },
      { status: 500 },
    );
  }
}

// POST /api/toppings - สร้าง topping ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.create");
    if (denied) return denied;

    const body = await request.json();
    const {
      name_i18n,
      price,
      ingredient_id,
      quantity_per_serving,
      is_active,
      product_ids,
    } = body;

    if (!name_i18n || price === undefined || !ingredient_id || !quantity_per_serving) {
      return NextResponse.json(
        {
          error:
            "name_i18n, price, ingredient_id, and quantity_per_serving are required",
        },
        { status: 400 },
      );
    }

    const ingredient = await prisma.product.findUnique({
      where: { id: ingredient_id },
      include: { product_type: true },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient product not found" },
        { status: 404 },
      );
    }

    if (ingredient.product_type.type === PRODUCTS_TYPES.SEMI_FINISHED) {
      return NextResponse.json(
        { error: "A topping's ingredient must be a real stock item, not a semi-finished product" },
        { status: 400 },
      );
    }

    const topping = await prisma.topping.create({
      data: {
        name_i18n,
        price,
        ingredient_id,
        quantity_per_serving,
        is_active: is_active ?? true,
        available_on:
          Array.isArray(product_ids) && product_ids.length > 0
            ? {
                create: product_ids.map((product_id: string) => ({
                  product_id,
                })),
              }
            : undefined,
      },
      include: {
        ingredient: { select: { id: true, code: true, name_i18n: true } },
        available_on: {
          include: {
            product: { select: { id: true, code: true, name_i18n: true } },
          },
        },
      },
    });

    return NextResponse.json(topping, { status: 201 });
  } catch (error) {
    console.error("Error creating topping:", error);
    return NextResponse.json(
      { error: "Failed to create topping" },
      { status: 500 },
    );
  }
}
