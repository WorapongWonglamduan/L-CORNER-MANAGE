import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";

// GET /api/toppings/[id] - ดึงข้อมูล topping ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.view");
    if (denied) return denied;

    const { id } = await params;

    const topping = await prisma.topping.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
      include: {
        ingredient: { select: { id: true, code: true, name_i18n: true, stock: true } },
        available_on: {
          include: {
            product: { select: { id: true, code: true, name_i18n: true } },
          },
        },
      },
    });

    if (!topping) {
      return NextResponse.json({ error: "Topping not found" }, { status: 404 });
    }

    // Master data (no warehouse selector here) — sum across all warehouses.
    return NextResponse.json({
      ...topping,
      ingredient: {
        ...topping.ingredient,
        current_stock: topping.ingredient.stock.reduce(
          (sum, s) => sum + Number(s.current_stock),
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching topping:", error);
    return NextResponse.json(
      { error: "Failed to fetch topping" },
      { status: 500 },
    );
  }
}

// PUT /api/toppings/[id] - อัพเดท topping
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.update");
    if (denied) return denied;
    const shopId = session!.user.shop_id!;

    const { id } = await params;
    const body = await request.json();
    const {
      name_i18n,
      price,
      ingredient_id,
      quantity_per_serving,
      is_active,
      product_ids,
    } = body;

    const existing = await prisma.topping.findFirst({
      where: { id, shop_id: shopId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Topping not found" }, { status: 404 });
    }

    // Same guards as POST /api/toppings — a negative quantity_per_serving
    // would make deductToppingStock's decrement in sales/route.ts an
    // increment instead, manufacturing stock on every sale.
    if (quantity_per_serving !== undefined && Number(quantity_per_serving) <= 0) {
      return NextResponse.json(
        { error: "quantity_per_serving must be greater than 0" },
        { status: 400 },
      );
    }
    if (price !== undefined && Number(price) < 0) {
      return NextResponse.json({ error: "price cannot be negative" }, { status: 400 });
    }

    // Re-validate a changed ingredient the same way POST does — otherwise
    // editing an existing topping could silently attach a semi-finished
    // product as its ingredient, which sales/route.ts's deductToppingStock
    // isn't equipped to handle (it deducts the product's own stock row
    // directly instead of exploding a recipe).
    if (ingredient_id !== undefined && ingredient_id !== existing.ingredient_id) {
      const ingredient = await prisma.product.findFirst({
        where: { id: ingredient_id, shop_id: shopId },
        include: { product_type: true },
      });
      if (!ingredient) {
        return NextResponse.json({ error: "Ingredient product not found" }, { status: 404 });
      }
      if (ingredient.product_type.type === PRODUCTS_TYPES.SEMI_FINISHED) {
        return NextResponse.json(
          { error: "A topping's ingredient must be a real stock item, not a semi-finished product" },
          { status: 400 },
        );
      }
    }

    if (Array.isArray(product_ids) && product_ids.length > 0) {
      const availableProducts = await prisma.product.findMany({
        where: { id: { in: product_ids }, shop_id: shopId },
        select: { id: true },
      });
      if (availableProducts.length !== new Set(product_ids).size) {
        return NextResponse.json(
          { error: "One or more products were not found" },
          { status: 400 },
        );
      }
    }

    const topping = await prisma.$transaction(async (tx) => {
      if (product_ids !== undefined) {
        await tx.productTopping.deleteMany({ where: { topping_id: id } });
        if (Array.isArray(product_ids) && product_ids.length > 0) {
          await tx.productTopping.createMany({
            data: product_ids.map((product_id: string) => ({
              product_id,
              topping_id: id,
            })),
          });
        }
      }

      return tx.topping.update({
        where: { id },
        data: {
          name_i18n: name_i18n ?? existing.name_i18n,
          price: price ?? existing.price,
          ingredient_id: ingredient_id ?? existing.ingredient_id,
          quantity_per_serving: quantity_per_serving ?? existing.quantity_per_serving,
          is_active: is_active !== undefined ? is_active : existing.is_active,
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
    });

    return NextResponse.json(topping);
  } catch (error) {
    console.error("Error updating topping:", error);
    return NextResponse.json(
      { error: "Failed to update topping" },
      { status: 500 },
    );
  }
}

// DELETE /api/toppings/[id] - ปิดใช้งาน topping (soft delete — keeps history intact)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "products.delete");
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.topping.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Topping not found" }, { status: 404 });
    }

    await prisma.topping.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ message: "Topping deactivated successfully" });
  } catch (error) {
    console.error("Error deleting topping:", error);
    return NextResponse.json(
      { error: "Failed to delete topping" },
      { status: 500 },
    );
  }
}
