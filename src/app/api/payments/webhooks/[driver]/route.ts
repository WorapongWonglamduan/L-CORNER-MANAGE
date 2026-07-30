import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentDriver } from "@/lib/payments";
import { reconcileIntent } from "@/lib/payments/reconcile";
import { Prisma } from "@prisma/client";

// POST /api/payments/webhooks/[driver] - the gateway calling US, so no
// auth() here at all. Deliberately lightweight: this is a NUDGE to check
// sooner, never the source of truth — reconcileIntent always re-asks the
// gateway itself via an authenticated call using our own secret key before
// ever creating a Sale, so a forged/duplicated/malformed webhook can at
// worst trigger one wasted re-check, never fabricate a success. Always
// responds 200 quickly; providers retry on non-2xx, and reconcileIntent is
// idempotent so a retry is free.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ driver: string }> },
) {
  try {
    const { driver: driverName } = await params;
    const rawBody = await request.text();

    let driver;
    try {
      driver = getPaymentDriver(driverName);
    } catch {
      return NextResponse.json({ ok: true });
    }

    const event = driver.parseWebhookEvent(rawBody);
    if (!event) {
      return NextResponse.json({ ok: true });
    }

    const intent = await prisma.paymentIntent.findUnique({
      where: { gateway_reference: event.gatewayReference },
    });
    if (!intent) {
      return NextResponse.json({ ok: true });
    }

    // Only trusted as an audit trail (visible in the admin view) if the
    // signature actually checks out — never trusted as the reconciliation
    // authority either way, signature-valid or not.
    if (driver.verifyWebhookSignature(rawBody, request.headers)) {
      try {
        await prisma.paymentIntent.update({
          where: { id: intent.id },
          data: { raw_last_webhook_payload: JSON.parse(rawBody) as Prisma.InputJsonValue },
        });
      } catch {
        // Malformed JSON that still parsed as a recognizable event shape —
        // not worth failing the webhook over.
      }
    }

    await reconcileIntent(intent.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing payment webhook:", error);
    return NextResponse.json({ ok: true });
  }
}
