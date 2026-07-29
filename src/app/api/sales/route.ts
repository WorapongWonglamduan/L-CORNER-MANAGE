import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  requirePermission,
  requireWarehouseAccess,
  assertWarehouseAccessLive,
} from "@/lib/permissions";
import { getLocale, getTranslations } from "next-intl/server";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import type { I18nText, Locale } from "@/types/i18n";

type TransactionClient = Prisma.TransactionClient;

// Shared between the idempotent-replay early return and the normal
// creation path's final fetch, so a replayed response looks identical in
// shape to a freshly-created one.
const SALE_DETAIL_INCLUDE = {
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
} satisfies Prisma.SaleInclude;

interface DeductStockContext {
  saleId: string;
  warehouseId: string;
  createdBy: string | null;
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations>>;
}

// Deducts `amount` from a product's current stock at the given warehouse,
// creating the ProductStock row (at 0) first if it doesn't exist yet.
//
// The decrement itself is one atomic `UPDATE ... WHERE current_stock >=
// amount` statement (via updateMany), not a read-then-write — two
// concurrent sales against the same row can never both read the same
// "enough stock" snapshot and both succeed, oversold, because the loser's
// WHERE simply stops matching once the winner's UPDATE commits first.
// Returns null (instead of throwing) when the guard fails, so the caller —
// which already has the product/ingredient name in scope — can throw its
// own localized message; pass enforceAvailability=false to skip the guard
// entirely for products with track_stock disabled (stock is allowed to go
// negative there, same as before).
async function deductProductStock(
  tx: TransactionClient,
  productId: string,
  warehouseId: string,
  amount: number,
  enforceAvailability: boolean,
) {
  await tx.productStock.upsert({
    where: {
      product_id_warehouse_id: {
        product_id: productId,
        warehouse_id: warehouseId,
      },
    },
    create: {
      product_id: productId,
      warehouse_id: warehouseId,
      current_stock: 0,
    },
    update: {},
  });

  const result = await tx.productStock.updateMany({
    where: enforceAvailability
      ? {
          product_id: productId,
          warehouse_id: warehouseId,
          current_stock: { gte: amount },
        }
      : { product_id: productId, warehouse_id: warehouseId },
    data: { current_stock: { decrement: amount } },
  });

  if (result.count === 0) {
    return null;
  }

  const updated = await tx.productStock.findUniqueOrThrow({
    where: {
      product_id_warehouse_id: {
        product_id: productId,
        warehouse_id: warehouseId,
      },
    },
  });
  const newQty = Number(updated.current_stock);
  return { currentQty: newQty + amount, newQty };
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
  const { saleId, warehouseId, createdBy, locale, t } = ctx;

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
    if (product.track_stock) {
      const existing = await tx.productStock.findUnique({
        where: {
          product_id_warehouse_id: {
            product_id: productId,
            warehouse_id: warehouseId,
          },
        },
      });
      const available = Number(existing?.current_stock) || 0;
      if (available - quantity < 0) {
        const productName = (product.name_i18n as unknown as I18nText)[locale];
        throw new Error(
          t("insufficientStock", {
            productName,
            available,
            required: quantity,
          }),
        );
      }
    }

    const deducted = await deductProductStock(
      tx,
      productId,
      warehouseId,
      quantity,
      product.track_stock,
    );
    if (!deducted) {
      // The check above passed, but a concurrent sale took the remaining
      // stock before this one's decrement ran — same message, since to the
      // cashier it's the same "not enough left" situation either way.
      const productName = (product.name_i18n as unknown as I18nText)[locale];
      throw new Error(
        t("insufficientStock", {
          productName,
          available: 0,
          required: quantity,
        }),
      );
    }
    const { currentQty, newQty } = deducted;

    await tx.stockMovement.create({
      data: {
        product_id: productId,
        warehouse_id: warehouseId,
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
      const existing = await tx.productStock.findUnique({
        where: {
          product_id_warehouse_id: {
            product_id: ri.ingredient_id,
            warehouse_id: warehouseId,
          },
        },
      });
      const available = Number(existing?.current_stock) || 0;
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
      const deducted = await deductProductStock(
        tx,
        recipeIngredient.ingredient_id,
        warehouseId,
        ingredientQty,
        recipeIngredient.ingredient.track_stock,
      );
      if (!deducted) {
        const ingredientName = (
          recipeIngredient.ingredient.name_i18n as unknown as I18nText
        )[locale];
        throw new Error(
          t("insufficientIngredient", {
            ingredientName,
            available: 0,
            required: ingredientQty,
          }),
        );
      }
      const { currentQty, newQty } = deducted;

      await tx.stockMovement.create({
        data: {
          product_id: recipeIngredient.ingredient_id,
          warehouse_id: warehouseId,
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
  const { saleId, warehouseId, createdBy, locale, t } = ctx;

  const topping = await tx.topping.findUnique({
    where: { id: toppingId },
    include: { ingredient: true },
  });

  if (!topping) {
    throw new Error(t("productNotFound", { productId: toppingId }));
  }

  if (!topping.ingredient.track_stock) return;

  const required = Number(topping.quantity_per_serving) * servings;

  const existing = await tx.productStock.findUnique({
    where: {
      product_id_warehouse_id: {
        product_id: topping.ingredient_id,
        warehouse_id: warehouseId,
      },
    },
  });
  const available = Number(existing?.current_stock) || 0;

  if (available - required < 0) {
    const ingredientName = (
      topping.ingredient.name_i18n as unknown as I18nText
    )[locale];
    throw new Error(
      t("insufficientIngredient", {
        ingredientName,
        available,
        required,
      }),
    );
  }

  const deducted = await deductProductStock(
    tx,
    topping.ingredient_id,
    warehouseId,
    required,
    true,
  );
  if (!deducted) {
    const ingredientName = (
      topping.ingredient.name_i18n as unknown as I18nText
    )[locale];
    throw new Error(
      t("insufficientIngredient", { ingredientName, available: 0, required }),
    );
  }
  const { currentQty, newQty } = deducted;

  await tx.stockMovement.create({
    data: {
      product_id: topping.ingredient_id,
      warehouse_id: warehouseId,
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

// Computes the next SAL-YYYYMMDD-NNNN number from today's highest existing
// one. Not race-safe by itself — two concurrent calls can read the same
// "last" row and compute the same next number — so callers must retry on a
// sale_number unique-constraint conflict rather than treat it as fatal.
async function generateSaleNumber(): Promise<string> {
  const today = new Date();
  // toISOString() is UTC — a sale made at 1am Bangkok time (UTC+7) is still
  // 6pm the previous UTC day, so it'd get stamped with yesterday's date
  // while sale_date (shown to the user in local time) already reads today.
  // format() uses the Date object's local getters instead, matching the
  // server's own Asia/Bangkok clock.
  const dateStr = format(today, "yyyyMMdd");
  const lastSale = await prisma.sale.findFirst({
    where: {
      sale_number: {
        startsWith: `SAL-${dateStr}`,
      },
    },
    orderBy: { sale_number: "desc" },
  });

  if (!lastSale) return `SAL-${dateStr}-0001`;
  const lastNumber = parseInt(lastSale.sale_number.split("-")[2]);
  return `SAL-${dateStr}-${(lastNumber + 1).toString().padStart(4, "0")}`;
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

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
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
      tax_rate = 0,
      payment_method,
      promotion_code,
      note,
      idempotency_key,
    } = body;

    if (!warehouse_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Warehouse and items are required" },
        { status: 400 },
      );
    }

    // A double-submit (double-click past the UI's own guard, a network
    // retry, two tabs) sends the same client-generated idempotency_key —
    // return the sale that request already created instead of the usual
    // path, which would otherwise create a second real sale (double stock
    // deduction, duplicate revenue) since nothing else here deduplicates
    // by cart contents.
    if (idempotency_key) {
      const existingSale = await prisma.sale.findUnique({
        where: { idempotency_key },
        include: SALE_DETAIL_INCLUDE,
      });
      if (existingSale) {
        return NextResponse.json(existingSale, { status: 200 });
      }
    }

    const deniedWarehouse = await assertWarehouseAccessLive(
      session,
      warehouse_id,
    );
    if (deniedWarehouse) return deniedWarehouse;

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

      // Always the server's current price, never the client-supplied one —
      // otherwise a client could set item.unit_price to anything (e.g. 0) and
      // buy at a price it made up itself.
      const unitPrice = Number(product.selling_price) || 0;
      const quantity = item.quantity || 1;
      if (!(quantity > 0)) {
        return NextResponse.json(
          { error: `Invalid quantity for product ${item.product_id}: ${quantity}` },
          { status: 400 },
        );
      }
      const itemSubtotal = unitPrice * quantity;
      // Per-item discounts aren't a feature anything in the app actually
      // sets (the only real discount path is a server-validated promotion
      // code, below) — trusting item.discount_amount/discount_percent from
      // the request would let a client discount its own items to nothing.
      const itemDiscountAmount = 0;

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
              {
                error: "This topping is not available for the selected product",
              },
              { status: 400 },
            );
          }

          const toppingQty = sel.quantity || 1;
          if (!(toppingQty > 0)) {
            return NextResponse.json(
              { error: `Invalid quantity for topping ${sel.topping_id}: ${toppingQty}` },
              { status: 400 },
            );
          }
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
        discount_percent: 0,
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
        return NextResponse.json(
          { error: tPromo("notFound") },
          { status: 400 },
        );
      }
      if (promotion.expires_at && promotion.expires_at < new Date()) {
        return NextResponse.json({ error: tPromo("expired") }, { status: 400 });
      }
      if (
        promotion.max_uses !== null &&
        promotion.used_count >= promotion.max_uses
      ) {
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

    // The only discount that's actually validated is a promotion code —
    // there's no manual-discount feature, so nothing else should reduce
    // the total (see the note on itemDiscountAmount above for why).
    const totalDiscount = promotionDiscount;
    const totalAmount = subtotal - totalDiscount;
    const taxAmount = 0; // No tax calculation
    const finalTotal = totalAmount;

    // Create sale in transaction. sale_number is (re)computed fresh on every
    // attempt and the whole transaction is retried on a unique-constraint
    // conflict on it: two checkouts racing at the same instant can both read
    // the same "last sale today" and compute the same next number, so the
    // loser here just needs to recompute against the winner's now-committed
    // row, not fail outright. Bounded so a genuine unrelated error still
    // surfaces instead of looping forever.
    const MAX_SALE_NUMBER_ATTEMPTS = 5;
    let newSale!: Awaited<ReturnType<typeof runSaleTransaction>>;
    for (let attempt = 1; ; attempt++) {
      const saleNumber = await generateSaleNumber();
      try {
        newSale = await runSaleTransaction(saleNumber);
        break;
      } catch (error) {
        const isSaleNumberConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          String(error.meta?.target ?? error.message).includes("sale_number");
        if (isSaleNumberConflict && attempt < MAX_SALE_NUMBER_ATTEMPTS)
          continue;

        // Two concurrent requests carrying the same idempotency_key can
        // both pass the initial findUnique check above before either
        // commits — retrying with a new sale_number wouldn't help here
        // (the key conflict would just recur), so return the sale the
        // other request already created instead of failing.
        const isIdempotencyConflict =
          idempotency_key &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          String(error.meta?.target ?? error.message).includes("idempotency_key");
        if (isIdempotencyConflict) {
          const wonByOther = await prisma.sale.findUnique({
            where: { idempotency_key },
            include: SALE_DETAIL_INCLUDE,
          });
          if (wonByOther) {
            return NextResponse.json(wonByOther, { status: 200 });
          }
        }

        throw error;
      }
    }

    async function runSaleTransaction(saleNumber: string) {
      return prisma.$transaction(async (tx) => {
        // Re-validate the promotion inside the transaction and claim its
        // usage atomically — same idiom as deductProductStock's updateMany
        // guard above. A plain findUnique-then-update here would let two
        // concurrent sales both read "used_count still under max_uses"
        // before either commits and both redeem it, over-using a
        // single-use code. Folding the used_count bound into the UPDATE's
        // WHERE makes Postgres itself serialize the two attempts: whichever
        // commits first is the only one that can still match the clause.
        if (promotionId) {
          const promotion = await tx.promotion.findUnique({
            where: { id: promotionId },
          });
          if (
            !promotion ||
            !promotion.is_active ||
            (promotion.expires_at && promotion.expires_at < new Date())
          ) {
            throw new Error(tPromo("usageLimitReached"));
          }
          const claimed = await tx.promotion.updateMany({
            where:
              promotion.max_uses === null
                ? { id: promotionId }
                : { id: promotionId, used_count: { lt: promotion.max_uses } },
            data: { used_count: { increment: 1 } },
          });
          if (claimed.count === 0) {
            throw new Error(tPromo("usageLimitReached"));
          }
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
            idempotency_key: idempotency_key || null,
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
          warehouseId: warehouse_id,
          createdBy: session?.user?.id || null,
          locale,
          t,
        };
        for (let i = 0; i < sale.items.length; i++) {
          const saleItem = sale.items[i];
          const processed = processedItems[i];
          await deductStock(
            tx,
            saleItem.product_id,
            Number(saleItem.base_quantity),
            deductCtx,
          );
          for (const topping of processed.toppings) {
            await deductToppingStock(
              tx,
              topping.topping_id,
              topping.quantity,
              deductCtx,
            );
          }
        }

        return sale;
      });
    }

    // Fetch complete sale data
    const completeSale = await prisma.sale.findUnique({
      where: { id: newSale.id },
      include: SALE_DETAIL_INCLUDE,
    });

    return NextResponse.json(completeSale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create sale";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
