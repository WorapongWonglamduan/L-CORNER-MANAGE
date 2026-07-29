import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  requirePermission,
  requireWarehouseAccess,
  assertWarehouseAccessLive,
} from "@/lib/permissions";
import { publishPrintJob, subscribe, type PrintJob } from "@/lib/print-job-bus";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;

function sseEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// GET /api/pos/print-jobs?warehouseId= - SSE stream of print jobs for the
// printer-agent page holding the Bluetooth pairing for one branch's printer.
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
      unsubscribe = subscribe(warehouseId, (job) => {
        controller.enqueue(encoder.encode(sseEvent(job)));
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

// POST /api/pos/print-jobs - publish a print job for a branch; called by the
// checkout flow (any device) right after a sale completes.
export async function POST(request: NextRequest) {
  const session = await auth();
  const denied = requirePermission(session, "sales.create");
  if (denied) return denied;

  const body = await request.json();
  const { warehouse_id, job } = body as { warehouse_id?: string; job?: PrintJob };

  if (!warehouse_id || !job) {
    return NextResponse.json(
      { error: "warehouse_id and job are required" },
      { status: 400 },
    );
  }

  const deniedWarehouse = await assertWarehouseAccessLive(session, warehouse_id);
  if (deniedWarehouse) return deniedWarehouse;

  publishPrintJob(warehouse_id, job);

  return NextResponse.json({ success: true });
}
