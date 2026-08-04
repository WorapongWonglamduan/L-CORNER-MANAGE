import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, assertWarehouseAccessLive } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import {
  previewSaleAmount,
  SaleCreationError,
  type CreateSaleInput,
} from "@/lib/sales/create-sale";
import { getPaymentDriver } from "@/lib/payments";
import { reconcileIntent } from "@/lib/payments/reconcile";

// A pending intent with nothing pinging it (customer abandoned the QR)
// shouldn't stay "actionable" forever in the UI — purely a cosmetic label,
// see expireIfStale() in reconcile.ts.
const INTENT_EXPIRY_MS = 15 * 60 * 1000;

// POST /api/payments/intents - starts a gateway-backed checkout. Same
// permission/warehouse-access shape as POST /api/sales (this is the
// gateway-payment equivalent of that route, not a separate feature with its
// own rules) — no Sale exists yet, only a PaymentIntent, until the gateway
// actually confirms the money moved (see reconcile.ts).
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.create");
    if (denied) return denied;

    const body = await request.json();
    const {
      warehouse_id,
      items,
      driver,
      method,
      card_token,
      tax_rate,
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
    if (!driver || !method) {
      return NextResponse.json(
        { error: "driver and method are required" },
        { status: 400 },
      );
    }

    const deniedWarehouse = await assertWarehouseAccessLive(session, warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

    // Defense-in-depth alongside assertWarehouseAccessLive above — same
    // shop-of-warehouse check as POST /api/sales, since this is that
    // route's gateway-payment equivalent.
    const warehouseInShop = await prisma.warehouse.findFirst({
      where: { id: warehouse_id, shop_id: session!.user.shop_id! },
      select: { id: true },
    });
    if (!warehouseInShop) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const cartInput: CreateSaleInput = {
      warehouse_id,
      items,
      tax_rate,
      payment_method,
      promotion_code,
      note,
    };

    let amount: number;
    try {
      amount = await previewSaleAmount(cartInput);
    } catch (error) {
      if (error instanceof SaleCreationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const intent = await prisma.paymentIntent.create({
      data: {
        driver,
        method,
        warehouse_id,
        amount,
        cart_snapshot: cartInput as unknown as Prisma.InputJsonValue,
        created_by: session?.user?.id || null,
        expires_at: new Date(Date.now() + INTENT_EXPIRY_MS),
      },
    });

    const paymentDriver = getPaymentDriver(driver);
    let chargeResult;
    try {
      chargeResult = await paymentDriver.createCharge({
        amount,
        currency: "thb",
        method,
        cardToken: card_token,
        metadata: { paymentIntentId: intent.id },
      });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "Failed to create charge";
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "failed", failure_reason: failureReason },
      });
      return NextResponse.json({ error: failureReason }, { status: 502 });
    }

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        gateway_reference: chargeResult.gatewayReference,
        qr_image_url: chargeResult.qrImageUrl,
        qr_payload: chargeResult.qrPayload,
      },
    });

    // A synchronous method (e.g. a card charge with no 3-D Secure step) can
    // resolve immediately — reconcile right away so the response already
    // includes the created Sale in one round-trip. An async/pending method
    // (PromptPay) just returns the intent for the client to poll.
    if (chargeResult.status !== "pending") {
      const reconciled = await reconcileIntent(intent.id);
      return NextResponse.json(reconciled, { status: 201 });
    }

    const pending = await prisma.paymentIntent.findUnique({ where: { id: intent.id } });
    return NextResponse.json(pending, { status: 201 });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    const message = error instanceof Error ? error.message : "Failed to create payment intent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
