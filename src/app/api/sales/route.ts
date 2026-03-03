import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { PRODUCTS_TYPES } from "@/constants/input-types";

// Helper function to deduct stock based on product type
async function deductStock(
  productId: string,
  quantity: number,
  warehouseId: string,
  saleId: string,
  userId?: string,
) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "sales.errors" });
  // Get product with its type and recipes
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      product_type: true,
      recipes: {
        where: { is_default: true, is_active: true },
        include: {
          ingredients: {
            include: {
              ingredient: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new Error(t("productNotFound", { productId }));
  }

  const productType = product.product_type.type;

  // FINISHED_GOOD: Deduct stock from the product itself
  if (productType === PRODUCTS_TYPES.FINISHED_GOOD) {
    const currentStock = await prisma.stock.findUnique({
      where: {
        product_id_warehouse_id: {
          product_id: productId,
          warehouse_id: warehouseId,
        },
      },
    });

    const currentQty = currentStock?.quantity || 0;
    const newQty = Number(currentQty) - quantity;

    // Allow negative stock - no validation

    // Update stock
    await prisma.stock.upsert({
      where: {
        product_id_warehouse_id: {
          product_id: productId,
          warehouse_id: warehouseId,
        },
      },
      update: { quantity: newQty },
      create: {
        product_id: productId,
        warehouse_id: warehouseId,
        quantity: newQty,
      },
    });

    // Update current_stock in product
    await prisma.product.update({
      where: { id: productId },
      data: { current_stock: newQty },
    });

    // Create stock transaction
    await prisma.stockTransaction.create({
      data: {
        product_id: productId,
        warehouse_id: warehouseId,
        transaction_type: "sale",
        quantity: -quantity,
        quantity_before: currentQty,
        quantity_after: newQty,
        reference_id: saleId,
        reference_type: "sale",
        note: `ขายสินค้าสำเร็จรูป: ${product.name_i18n[locale]}`,
        created_by: userId,
      },
    });
  }
  // SEMI_FINISHED: Deduct stock from ingredients based on recipe
  else if (productType === PRODUCTS_TYPES.SEMI_FINISHED) {
    // Filter only default recipes
    const defaultRecipes = product.recipes.filter(r => r.is_default);
    
    if (defaultRecipes.length === 0) {
      const productName = product.name_i18n[locale];
      throw new Error(t("noRecipe", { productName }));
    }
    
    // Use only the first default recipe to avoid duplicate deductions
    const defaultRecipe = defaultRecipes[0];
    
    if (!defaultRecipe.ingredients || defaultRecipe.ingredients.length === 0) {
      const productName = product.name_i18n[locale];
      throw new Error(t("noRecipe", { productName }));
    }

    console.log('DEBUG: Using recipe:', defaultRecipe.name_i18n, 'with', defaultRecipe.ingredients.length, 'ingredients');

    // Deduct each ingredient
    for (const recipeIngredient of defaultRecipe.ingredients) {
      const ingredientQty = Number(recipeIngredient.quantity) * quantity;
      const ingredient = recipeIngredient.ingredient;
      const ingredientProductId = recipeIngredient.ingredient_id;
      
      console.log('DEBUG Stock Deduction:', {
        productName: product.name_i18n[locale],
        ingredientName: ingredient.name_i18n[locale],
        recipeQuantity: recipeIngredient.quantity,
        saleQuantity: quantity,
        calculatedIngredientQty: ingredientQty,
        ingredientProductId
      });

      const currentStock = await prisma.stock.findUnique({
        where: {
          product_id_warehouse_id: {
            product_id: ingredientProductId,
            warehouse_id: warehouseId,
          },
        },
      });

      const currentQty = currentStock?.quantity || 0;
      const newQty = Number(currentQty) - ingredientQty;

      // Allow negative stock - no validation

      // Update stock
      await prisma.stock.upsert({
        where: {
          product_id_warehouse_id: {
            product_id: ingredientProductId,
            warehouse_id: warehouseId,
          },
        },
        update: { quantity: newQty },
        create: {
          product_id: ingredientProductId,
          warehouse_id: warehouseId,
          quantity: newQty,
        },
      });

      // Update current_stock in product
      await prisma.product.update({
        where: { id: ingredientProductId },
        data: { current_stock: newQty },
      });

      // Create stock transaction
      await prisma.stockTransaction.create({
        data: {
          product_id: ingredientProductId,
          warehouse_id: warehouseId,
          transaction_type: "sale",
          quantity: -ingredientQty,
          quantity_before: currentQty,
          quantity_after: newQty,
          unit_id: recipeIngredient.unit_id,
          quantity_in_unit: ingredientQty,
          reference_id: saleId,
          reference_type: "sale",
          note: `ใช้วัตถุดิบสำหรับ ${product.name_i18n[locale]} (${quantity})`,
          created_by: userId,
        },
      });
    }
  }
}

// GET: List all sales
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const warehouseId = searchParams.get("warehouseId");

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { sale_number: { contains: search, mode: "insensitive" } },
        {
          customer: {
            full_name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (warehouseId) {
      where.warehouse_id = warehouseId;
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          warehouse: true,
          created_by_user: {
            select: {
              id: true,
              full_name: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  product_type: true,
                },
              },
              product_unit: {
                include: {
                  unit: true,
                },
              },
              recipe: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      data: sales,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sales" },
      { status: 500 },
    );
  }
}

// POST: Create a new sale with automatic stock deduction
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_id,
      warehouse_id,
      items,
      discount_amount = 0,
      tax_rate = 7,
      payment_method,
      note,
    } = body;

    if (!warehouse_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Warehouse and items are required" },
        { status: 400 },
      );
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.product_id },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product_id}` },
          { status: 400 },
        );
      }

      const unitPrice = item.unit_price || product.selling_price || 0;
      const quantity = item.quantity;
      const itemDiscount = item.discount_amount || 0;
      const totalAmount = Number(unitPrice) * quantity - itemDiscount;

      subtotal += totalAmount;

      processedItems.push({
        product_id: item.product_id,
        product_unit_id: null,
        recipe_id: item.recipe_id || null,
        quantity,
        unit_price: unitPrice,
        discount_amount: itemDiscount,
        total_amount: totalAmount,
        cost_price: product.cost_price || 0,
        base_quantity: quantity,
        note: item.note || null,
      });
    }

    const taxAmount = (subtotal * Number(tax_rate)) / 100;
    const totalAmount = subtotal - Number(discount_amount) + taxAmount;

    // Generate sale number
    const lastSale = await prisma.sale.findFirst({
      orderBy: { created_at: "desc" },
    });

    const lastNumber = lastSale?.sale_number
      ? parseInt(lastSale.sale_number.split("-")[1] || "0")
      : 0;
    const saleNumber = `SAL-${String(lastNumber + 1).padStart(6, "0")}`;

    // Create sale with items in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          sale_number: saleNumber,
          customer_id,
          warehouse_id,
          subtotal,
          discount_amount,
          tax_rate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method,
          payment_status: "paid",
          status: "completed",
          note,
          created_by: session.user?.id,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  product_type: true,
                },
              },
            },
          },
        },
      });

      // Deduct stock for each item
      console.log('DEBUG: Total sale items:', newSale.items.length);
      for (const item of newSale.items) {
        console.log('DEBUG: Calling deductStock for product_id:', item.product_id, 'quantity:', item.base_quantity);
        await deductStock(
          item.product_id,
          Number(item.base_quantity),
          warehouse_id,
          newSale.id,
          session.user?.id,
        );
      }

      return newSale;
    });

    // Fetch complete sale data
    const completeSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: {
              include: {
                product_type: true,
              },
            },
            product_unit: {
              include: {
                unit: true,
              },
            },
            recipe: true,
          },
        },
      },
    });

    return NextResponse.json(completeSale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create sale" },
      { status: 500 },
    );
  }
}
