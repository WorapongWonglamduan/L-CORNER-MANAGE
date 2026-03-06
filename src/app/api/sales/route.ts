import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { Prisma } from "@prisma/client";

// Helper function to deduct stock based on product type
async function deductStock(productId: string, quantity: number) {
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
    const currentQty = product?.current_stock || 0;
    const newQty = Number(currentQty) - quantity;

    // Update stock
    await prisma.product.update({
      where: { id: productId },
      data: { current_stock: newQty },
    });
  }
  // SEMI_FINISHED: Deduct stock from ingredients based on recipe
  else if (productType === PRODUCTS_TYPES.SEMI_FINISHED) {
    // Step 1: เอา product_id ไป where table recipes หา product_id
    const recipes = await prisma.recipe.findFirst({
      where: {
        product_id: productId,
        is_default: true,
        is_active: true,
      },
    });

    if (!recipes) {
      const productName = product.name_i18n[locale];
      throw new Error(t("noRecipe", { productName }));
    }

    // Step 2: จะได้ id ของ recipes (ใช้ recipe แรก)
    const recipeId = recipes.id;
    console.log("recipes =>", recipes);

    // Step 3: เอา recipe_id where table recipe_ingredients
    const recipeIngredients = await prisma.recipeIngredient.findMany({
      where: {
        recipe_id: recipeId,
      },
    });

    if (recipeIngredients.length === 0) {
      const productName = product.name_i18n[locale];
      throw new Error(t("noRecipe", { productName }));
    }

    // Step 4: จะได้ list มา จากนั้นเอา ingredient_id ไปหา table products.id
    for (const recipeIngredient of recipeIngredients) {
      const ingredientQty = Number(recipeIngredient.quantity) * quantity;
      const ingredientProductId = recipeIngredient.ingredient_id;

      // Step 5: หา product ของวัตถุดิบเพื่อรู้ current_stock
      const ingredientProduct = await prisma.product.findUnique({
        where: { id: ingredientProductId },
      });

      if (!ingredientProduct) {
        continue;
      }

      const currentQty = Number(ingredientProduct.current_stock) || 0;
      const newQty = currentQty - ingredientQty;

      // Step 6: อัพเดท current_stock ใน table products เลย
      await prisma.product.update({
        where: { id: ingredientProductId },
        data: { current_stock: newQty },
      });
    }
  }
}

// GET /api/sales - Get all sales with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const searchQuery = searchParams.get("searchQuery") || "";
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const customerId = searchParams.get("customerId");
    const warehouseId = searchParams.get("warehouseId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.SaleWhereInput = {};

    if (searchQuery) {
      where.sale_number = { contains: searchQuery, mode: "insensitive" };
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.payment_status = paymentStatus;
    }

    if (customerId) {
      where.customer_id = customerId;
    }

    if (warehouseId) {
      where.warehouse_id = warehouseId;
    }

    if (startDate || endDate) {
      where.sale_date = {};
      if (startDate) {
        where.sale_date.gte = new Date(startDate);
      }
      if (endDate) {
        where.sale_date.lte = new Date(endDate);
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
          items: {
            include: {
              product: {
                include: {
                  product_type: true,
                  base_unit: true,
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
    // Allow POS sales without authentication
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body = await request.json();
    const {
      customer_id,
      warehouse_id,
      items,
      discount_amount = 0,
      tax_rate = 0,
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
        include: {
          product_type: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product_id}` },
          { status: 404 },
        );
      }

      const unitPrice = item.unit_price || product.selling_price || 0;
      const quantity = item.quantity || 1;
      const itemSubtotal = unitPrice * quantity;
      const itemDiscountAmount = item.discount_amount || 0;
      const totalAmount = itemSubtotal - itemDiscountAmount;

      subtotal += itemSubtotal;

      processedItems.push({
        product_id: item.product_id,
        quantity,
        unit_price: unitPrice,
        discount_percent: item.discount_percent || 0,
        discount_amount: itemDiscountAmount,
        total_amount: totalAmount,
        cost_price: product.cost_price || 0,
        base_quantity: quantity,
        note: item.note || "",
      });
    }

    const totalAmount = subtotal - discount_amount;
    const taxAmount = 0; // No tax calculation
    const finalTotal = totalAmount;

    // Generate sale number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const lastSale = await prisma.sale.findFirst({
      where: {
        sale_number: {
          startsWith: `SAL-${dateStr}`,
        },
      },
      orderBy: { sale_number: "desc" },
    });

    let saleNumber = `SAL-${dateStr}-0001`;
    if (lastSale) {
      const lastNumber = parseInt(lastSale.sale_number.split("-")[2]);
      const newNumber = (lastNumber + 1).toString().padStart(4, "0");
      saleNumber = `SAL-${dateStr}-${newNumber}`;
    }
    console.log("session ->", session);
    // Create sale in transaction
    const newSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          sale_number: saleNumber,
          sale_date: new Date(),
          customer_id,
          warehouse_id,
          subtotal,
          discount_amount,
          tax_rate,
          tax_amount: taxAmount,
          total_amount: finalTotal,
          payment_method,
          payment_status: "paid",
          status: "completed",
          created_by: session?.user?.id || null,
          note,
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
      for (const item of sale.items) {
        await deductStock(item.product_id, Number(item.base_quantity));
      }

      return sale;
    });

    // Fetch complete sale data
    const completeSale = await prisma.sale.findUnique({
      where: { id: newSale.id },
      include: {
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
                base_unit: true,
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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create sale";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
