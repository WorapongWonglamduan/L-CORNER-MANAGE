import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  requirePermission,
  requireWarehouseAccess,
  assertWarehouseAccessLive,
} from "@/lib/permissions";
import { publishCart, subscribe, getLastSnapshot } from "@/lib/pos-display-bus";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;

function sseEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// GET /api/pos/display?warehouseId= - SSE stream of cart snapshots for the
// customer-facing display screen of one branch.
export async function GET(request: NextRequest) {
  const session = await auth();

  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get("warehouseId");
  if (!warehouseId) {
    return NextResponse.json(
      { error: "warehouseId is required" },
      { status: 400 },
    );
  }

  const deniedWarehouse = requireWarehouseAccess(session, warehouseId);
  if (deniedWarehouse) return deniedWarehouse;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(sseEvent(getLastSnapshot(warehouseId) ?? null)),
      );

      unsubscribe = subscribe(warehouseId, (snapshot) => {
        controller.enqueue(encoder.encode(sseEvent(snapshot)));
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST /api/pos/display - publish the current cart snapshot for a branch;
// called by the POS page itself whenever its cart changes.
export async function POST(request: NextRequest) {
  const session = await auth();
  const denied = requirePermission(session, "sales.create");
  if (denied) return denied;

  const body = await request.json();
  const { warehouse_id, items, total, itemCount, payment } = body;

  if (!warehouse_id) {
    return NextResponse.json(
      { error: "warehouse_id is required" },
      { status: 400 },
    );
  }

  const deniedWarehouse = await assertWarehouseAccessLive(
    session,
    warehouse_id,
  );
  if (deniedWarehouse) return deniedWarehouse;

  publishCart(warehouse_id, { items, total, itemCount, payment: payment ?? null });

  return NextResponse.json({ success: true });
}
