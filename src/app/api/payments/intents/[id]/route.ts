import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireWarehouseAccess } from "@/lib/permissions";
import { reconcileIntent, expireIfStale } from "@/lib/payments/reconcile";

// GET /api/payments/intents/[id] - the checkout UI polls this while a
// gateway payment (e.g. a PromptPay QR) is pending. Every call re-checks the
// gateway itself via reconcileIntent — never just reads whatever
// status/sale_id happened to be cached from an earlier call.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const intent = await prisma.paymentIntent.findUnique({
      where: { id },
      include: { warehouse: { select: { shop_id: true } } },
    });
    if (!intent) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }

    const deniedWarehouse = requireWarehouseAccess(session, intent.warehouse_id);
    if (deniedWarehouse) return deniedWarehouse;

    // Defense-in-depth: same shop-of-warehouse check as GET /api/sales/[id].
    if (intent.warehouse.shop_id !== session!.user.shop_id) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }

    await expireIfStale(id);
    const reconciled = await reconcileIntent(id);

    return NextResponse.json(reconciled);
  } catch (error) {
    console.error("Error polling payment intent:", error);
    const message = error instanceof Error ? error.message : "Failed to poll payment intent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
