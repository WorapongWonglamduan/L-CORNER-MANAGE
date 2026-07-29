import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, assertWarehouseAccessLive } from "@/lib/permissions";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { MOVEMENT_DIRECTIONS } from "@/constants/inventory";
import type { I18nText } from "@/types/i18n";

// POST /api/production - สร้างรายการผลิตสินค้า semi_finished
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "inventory.adjust");
    if (denied) return denied;

    const body = await request.json();
    const { product_id, warehouse_id, quantity, reason, note } = body;

    if (!product_id || !warehouse_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing required fields or invalid quantity" },
        { status: 400 }
      );
    }

    const deniedWarehouse = await assertWarehouseAccessLive(session, warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

    // ตรวจสอบว่าเป็นสินค้า semi_finished
    const product = await prisma.product.findUnique({
      where: { id: product_id },
      include: {
        product_type: true,
        base_unit: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.product_type.type !== PRODUCTS_TYPES.SEMI_FINISHED) {
      return NextResponse.json(
        { error: "Product is not semi_finished type" },
        { status: 400 }
      );
    }

    // ดึงสูตรการผลิต
    const recipe = await prisma.recipe.findFirst({
      where: {
        product_id,
        is_active: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: {
                stock: { where: { warehouse_id } },
              },
            },
            unit: true,
          },
        },
      },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "No recipe found for this product" },
        { status: 404 }
      );
    }

    const productName = product.name_i18n as unknown as I18nText;
    const baseUnitAbbr = product.base_unit.abbreviation_i18n as unknown as I18nText;
    const recipeName = recipe.name_i18n as unknown as I18nText;

    // คำนวณวัตถุดิบที่ต้องใช้ (สต็อกที่คลังที่เลือกผลิต)
    const requiredIngredients = recipe.ingredients.map((ing) => ({
      ingredient_id: ing.ingredient_id,
      required: Number(ing.quantity) * quantity,
      current_stock: Number(ing.ingredient.stock[0]?.current_stock) || 0,
      name: ing.ingredient.name_i18n,
    }));

    // ตรวจสอบว่าวัตถุดิบเพียงพอหรือไม่
    const insufficientIngredients = requiredIngredients.filter(
      (ing) => ing.current_stock < ing.required
    );

    if (insufficientIngredients.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient ingredients",
          insufficient: insufficientIngredients.map((ing) => ({
            name: ing.name,
            required: ing.required,
            available: ing.current_stock,
          })),
        },
        { status: 400 }
      );
    }

    // ใช้ Transaction เพื่อความปลอดภัย
    const result = await prisma.$transaction(async (tx) => {
      const stockMovements = [];

      // 1. หักวัตถุดิบ
      for (const recipeIng of recipe.ingredients) {
        const requiredQty = Number(recipeIng.quantity) * quantity;

        // Atomic guarded decrement — same idiom as deductProductStock() in
        // sales/route.ts. The pre-transaction `insufficientIngredients`
        // check above reads stock before the transaction opens, so it's
        // only an early UX check; this UPDATE's WHERE...current_stock>=
        // clause is what actually enforces it, so two concurrent
        // productions racing on the same ingredient can't both pass a
        // stale check and both deduct past zero.
        const decremented = await tx.productStock.updateMany({
          where: {
            product_id: recipeIng.ingredient_id,
            warehouse_id,
            current_stock: { gte: requiredQty },
          },
          data: { current_stock: { decrement: requiredQty } },
        });
        if (decremented.count === 0) {
          throw new Error(
            `Insufficient stock for ingredient: ${(recipeIng.ingredient.name_i18n as unknown as I18nText).th || (recipeIng.ingredient.name_i18n as unknown as I18nText).en}`,
          );
        }
        const ingredientStock = await tx.productStock.findUniqueOrThrow({
          where: {
            product_id_warehouse_id: { product_id: recipeIng.ingredient_id, warehouse_id },
          },
        });
        const ingredientAfter = Number(ingredientStock.current_stock);
        const ingredientBefore = ingredientAfter + requiredQty;

        // บันทึก StockMovement สำหรับวัตถุดิบ (ลด)
        const movement = await tx.stockMovement.create({
          data: {
            product_id: recipeIng.ingredient_id,
            warehouse_id,
            movement_type: "production",
            direction: MOVEMENT_DIRECTIONS.OUT,
            quantity_before: ingredientBefore,
            quantity_change: requiredQty,
            quantity_after: ingredientAfter,
            reason_text: reason || "ใช้ในการผลิต",
            note: note
              ? `${note} (ผลิต ${productName.th || productName.en} ${quantity} ${baseUnitAbbr.th || baseUnitAbbr.en})`
              : `ผลิต ${productName.th || productName.en} ${quantity} ${baseUnitAbbr.th || baseUnitAbbr.en}`,
            reference_type: "production",
            reference_id: product_id,
            created_by: session?.user?.id || "system",
          },
        });

        stockMovements.push(movement);
      }

      // 2. เพิ่มสินค้า semi_finished ที่คลังนี้ — atomic increment (upsert's
      // `update` branch runs a single `SET current_stock = current_stock +
      // quantity`, not a read-then-write), so no race with any other
      // concurrent stock movement on this same row.
      const updatedProductStock = await tx.productStock.upsert({
        where: { product_id_warehouse_id: { product_id, warehouse_id } },
        create: { product_id, warehouse_id, current_stock: Number(quantity) },
        update: { current_stock: { increment: Number(quantity) } },
      });
      const productAfter = Number(updatedProductStock.current_stock);
      const productBefore = productAfter - Number(quantity);

      // 3. บันทึก StockMovement สำหรับสินค้า semi_finished (เพิ่ม)
      const productMovement = await tx.stockMovement.create({
        data: {
          product_id,
          warehouse_id,
          movement_type: "production",
          direction: MOVEMENT_DIRECTIONS.IN,
          quantity_before: productBefore,
          quantity_change: quantity,
          quantity_after: productAfter,
          reason_text: reason || "ผลิตสินค้า",
          note: note || `ผลิตจากสูตร ${recipeName.th || recipeName.en}`,
          reference_type: "production",
          reference_id: recipe.id,
          created_by: session?.user?.id || "system",
        },
      });

      stockMovements.push(productMovement);

      return {
        productStock: updatedProductStock,
        movements: stockMovements,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Production completed successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in production:", error);
    const message = error instanceof Error ? error.message : "Failed to complete production";
    const isInsufficientStock = message.startsWith("Insufficient stock for ingredient");
    return NextResponse.json(
      { error: message },
      { status: isInsufficientStock ? 400 : 500 }
    );
  }
}
