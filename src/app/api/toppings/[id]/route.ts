import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";

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

    const topping = await prisma.topping.findUnique({
      where: { id },
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

    const existing = await prisma.topping.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Topping not found" }, { status: 404 });
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

    const existing = await prisma.topping.findUnique({ where: { id } });
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
