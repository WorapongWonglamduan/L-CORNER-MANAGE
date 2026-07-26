import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { getLocale, getTranslations } from "next-intl/server";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { Prisma } from "@prisma/client";
import type { I18nText, Locale } from "@/types/i18n";

type TransactionClient = Prisma.TransactionClient;

interface DeductStockContext {
  saleId: string;
  createdBy: string | null;
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations>>;
}

// Deducts stock for one sale item, based on product type, inside the caller's
// transaction. Throws (aborting the whole sale transaction) if stock isn't
// sufficient, and logs a StockMovement row for every quantity changed so the
// sale is reflected in the audit trail.
async function deductStock(
  tx: TransactionClient,
  productId: string,
  quantity: number,
  ctx: DeductStockContext,
) {
  const { saleId, createdBy, locale, t } = ctx;

  const product = await tx.product.findUnique({
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

  // FINISHED_GOOD / INGREDIENT: Deduct stock from the product itself
  if (productType !== PRODUCTS_TYPES.SEMI_FINISHED) {
    const currentQty = Number(product.current_stock) || 0;
    const newQty = currentQty - quantity;

    if (product.track_stock && newQty < 0) {
      const productName = (product.name_i18n as unknown as I18nText)[locale];
      throw new Error(
        t("insufficientStock", {
          productName,
          available: currentQty,
          required: quantity,
        }),
      );
    }

    await tx.product.update({
      where: { id: productId },
      data: { current_stock: newQty },
    });

    await tx.stockMovement.create({
      data: {
        product_id: productId,
        movement_type: "sale",
        direction: "out",
        quantity_before: currentQty,
        quantity_change: quantity,
        quantity_after: newQty,
        reference_type: "sale",
        reference_id: saleId,
        reason_code: "sale",
        reason_text: "ขายสินค้า",
        created_by: createdBy || "",
      },
    });
  }
  // SEMI_FINISHED: Deduct stock from ingredients based on recipe
  else {
    const recipe = product.recipes[0];

    if (!recipe) {
      const productName = (product.name_i18n as unknown as I18nText)[locale];
      throw new Error(t("noRecipe", { productName }));
    }

    const recipeIngredients = await tx.recipeIngredient.findMany({
      where: { recipe_id: recipe.id },
      include: { ingredient: true },
    });

    if (recipeIngredients.length === 0) {
      const productName = (product.name_i18n as unknown as I18nText)[locale];
      throw new Error(t("noRecipe", { productName }));
    }

    // Validate every ingredient has enough stock BEFORE deducting any of
    // them, so a shortage partway through never leaves a partial deduction.
    for (const ri of recipeIngredients) {
      if (!ri.ingredient.track_stock) continue;
      const required = Number(ri.quantity) * quantity;
      const available = Number(ri.ingredient.current_stock) || 0;
      if (available - required < 0) {
        const ingredientName = (ri.ingredient.name_i18n as unknown as I18nText)[
          locale
        ];
        throw new Error(
          t("insufficientIngredient", { ingredientName, available, required }),
        );
      }
    }

    for (const recipeIngredient of recipeIngredients) {
      const ingredientQty = Number(recipeIngredient.quantity) * quantity;
      const currentQty = Number(recipeIngredient.ingredient.current_stock) || 0;
      const newQty = currentQty - ingredientQty;

      await tx.product.update({
        where: { id: recipeIngredient.ingredient_id },
        data: { current_stock: newQty },
      });

      await tx.stockMovement.create({
        data: {
          product_id: recipeIngredient.ingredient_id,
          movement_type: "sale",
          direction: "out",
          quantity_before: currentQty,
          quantity_change: ingredientQty,
          quantity_after: newQty,
          reference_type: "sale",
          reference_id: saleId,
          reason_code: "sale",
          reason_text: `ใช้เป็นวัตถุดิบสำหรับสูตร: ${(product.name_i18n as unknown as I18nText)[locale]}`,
          created_by: createdBy || "",
        },
      });
    }
  }
}

// Deducts stock for one topping selection (fixed ingredient + quantity_per_serving,
// scaled by how many servings of the parent item were sold). Same
// validate-then-deduct-all pattern as deductStock's recipe branch.
async function deductToppingStock(
  tx: TransactionClient,
  toppingId: string,
  servings: number,
  ctx: DeductStockContext,
) {
  const { saleId, createdBy, locale, t } = ctx;

  const topping = await tx.topping.findUnique({
    where: { id: toppingId },
    include: { ingredient: true },
  });

  if (!topping) {
    throw new Error(t("productNotFound", { productId: toppingId }));
  }

  if (!topping.ingredient.track_stock) return;

  const required = Number(topping.quantity_per_serving) * servings;
  const currentQty = Number(topping.ingredient.current_stock) || 0;
  const newQty = currentQty - required;

  if (newQty < 0) {
    const ingredientName = (topping.ingredient.name_i18n as unknown as I18nText)[
      locale
    ];
    throw new Error(
      t("insufficientIngredient", {
        ingredientName,
        available: currentQty,
        required,
      }),
    );
  }

  await tx.product.update({
    where: { id: topping.ingredient_id },
    data: { current_stock: newQty },
  });

  await tx.stockMovement.create({
    data: {
      product_id: topping.ingredient_id,
      movement_type: "sale",
      direction: "out",
      quantity_before: currentQty,
      quantity_change: required,
      quantity_after: newQty,
      reference_type: "sale",
      reference_id: saleId,
      reason_code: "sale",
      reason_text: `ใช้เป็นวัตถุดิบสำหรับ topping: ${(topping.name_i18n as unknown as I18nText)[locale]}`,
      created_by: createdBy || "",
    },
  });
}

// GET /api/sales - Get all sales with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.view");
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const searchQuery = searchParams.get("searchQuery") || "";
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
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

interface ToppingSelection {
  topping_id: string;
  quantity?: number;
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
    const {
      warehouse_id,
      items,
      discount_amount = 0,
      tax_rate = 0,
      payment_method,
      promotion_code,
      note,
    } = body;

    if (!warehouse_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Warehouse and items are required" },
        { status: 400 },
      );
    }

    // Calculate totals, resolving each item's product + any selected toppings
    let subtotal = 0;
    const processedItems: {
      product_id: string;
      quantity: number;
      unit_price: number;
      discount_percent: number;
      discount_amount: number;
      total_amount: number;
      cost_price: number;
      base_quantity: number;
      note: string;
      toppings: { topping_id: string; quantity: number; unit_price: number }[];
    }[] = [];

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

      // Toppings — only ever valid on SEMI_FINISHED products, and only if
      // actually offered on this specific product via ProductTopping.
      const toppingSelections: ToppingSelection[] = Array.isArray(item.toppings)
        ? item.toppings
        : [];
      let toppingsTotal = 0;
      const resolvedToppings: {
        topping_id: string;
        quantity: number;
        unit_price: number;
      }[] = [];

      if (toppingSelections.length > 0) {
        if (product.product_type.type !== PRODUCTS_TYPES.SEMI_FINISHED) {
          return NextResponse.json(
            { error: "Toppings can only be added to semi-finished products" },
            { status: 400 },
          );
        }

        for (const sel of toppingSelections) {
          const topping = await prisma.topping.findUnique({
            where: { id: sel.topping_id },
            include: { available_on: true },
          });

          if (!topping || !topping.is_active) {
            return NextResponse.json(
              { error: `Topping not found: ${sel.topping_id}` },
              { status: 404 },
            );
          }

          const isOffered = topping.available_on.some(
            (pt) => pt.product_id === item.product_id,
          );
          if (!isOffered) {
            return NextResponse.json(
              { error: "This topping is not available for the selected product" },
              { status: 400 },
            );
          }

          const toppingQty = sel.quantity || 1;
          const toppingPrice = Number(topping.price);
          toppingsTotal += toppingPrice * toppingQty * quantity;
          resolvedToppings.push({
            topping_id: topping.id,
            quantity: toppingQty * quantity,
            unit_price: toppingPrice,
          });
        }
      }

      const totalAmount = itemSubtotal + toppingsTotal - itemDiscountAmount;

      subtotal += itemSubtotal + toppingsTotal;

      processedItems.push({
        product_id: item.product_id,
        quantity,
        unit_price: unitPrice,
        discount_percent: item.discount_percent || 0,
        discount_amount: itemDiscountAmount,
        total_amount: totalAmount,
        cost_price: Number(product.cost_price) || 0,
        base_quantity: quantity,
        note: item.note || "",
        toppings: resolvedToppings,
      });
    }

    // Resolve promotion code (if any) — re-validated again inside the
    // transaction right before incrementing used_count.
    let promotionDiscount = 0;
    let promotionId: string | null = null;
    let promotionCodeNormalized: string | null = null;

    if (promotion_code) {
      promotionCodeNormalized = String(promotion_code).toUpperCase();
      const promotion = await prisma.promotion.findUnique({
        where: { code: promotionCodeNormalized },
      });

      if (!promotion || !promotion.is_active) {
        return NextResponse.json({ error: tPromo("notFound") }, { status: 400 });
      }
      if (promotion.expires_at && promotion.expires_at < new Date()) {
        return NextResponse.json({ error: tPromo("expired") }, { status: 400 });
      }
      if (promotion.max_uses !== null && promotion.used_count >= promotion.max_uses) {
        return NextResponse.json(
          { error: tPromo("usageLimitReached") },
          { status: 400 },
        );
      }

      promotionId = promotion.id;
      promotionDiscount =
        promotion.discount_type === "percentage"
          ? (subtotal * Number(promotion.discount_value)) / 100
          : Math.min(Number(promotion.discount_value), subtotal);
    }

    const totalDiscount = Number(discount_amount) + promotionDiscount;
    const totalAmount = subtotal - totalDiscount;
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

    // Create sale in transaction
    const newSale = await prisma.$transaction(async (tx) => {
      // Re-validate the promotion's usage limit inside the transaction and
      // claim it atomically, so it can't be over-redeemed by a race.
      if (promotionId) {
        const promotion = await tx.promotion.findUnique({
          where: { id: promotionId },
        });
        if (
          !promotion ||
          !promotion.is_active ||
          (promotion.expires_at && promotion.expires_at < new Date()) ||
          (promotion.max_uses !== null && promotion.used_count >= promotion.max_uses)
        ) {
          throw new Error(tPromo("usageLimitReached"));
        }
        await tx.promotion.update({
          where: { id: promotionId },
          data: { used_count: { increment: 1 } },
        });
      }

      const sale = await tx.sale.create({
        data: {
          sale_number: saleNumber,
          sale_date: new Date(),
          warehouse_id,
          subtotal,
          discount_amount: totalDiscount,
          tax_rate,
          tax_amount: taxAmount,
          total_amount: finalTotal,
          payment_method,
          payment_status: "paid",
          status: "completed",
          created_by: session?.user?.id || null,
          promotion_id: promotionId,
          promotion_code: promotionCodeNormalized,
          note,
          items: {
            create: processedItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
              discount_amount: item.discount_amount,
              total_amount: item.total_amount,
              cost_price: item.cost_price,
              base_quantity: item.base_quantity,
              note: item.note,
              toppings: {
                create: item.toppings,
              },
            })),
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

      // Deduct stock for each item (and any toppings on it), inside this same
      // transaction so a shortage anywhere rolls back the whole sale (no
      // partial writes, no half-claimed promotion).
      const deductCtx: DeductStockContext = {
        saleId: sale.id,
        createdBy: session?.user?.id || null,
        locale,
        t,
      };
      for (let i = 0; i < sale.items.length; i++) {
        const saleItem = sale.items[i];
        const processed = processedItems[i];
        await deductStock(tx, saleItem.product_id, Number(saleItem.base_quantity), deductCtx);
        for (const topping of processed.toppings) {
          await deductToppingStock(tx, topping.topping_id, topping.quantity, deductCtx);
        }
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
