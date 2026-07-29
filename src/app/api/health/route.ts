import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/health - lightweight, unauthenticated reachability check. Polled
// client-side (see useConnectivity) to detect a real internet/server outage,
// since navigator.onLine only reflects the local network interface (it stays
// "true" even when the router's WAN link is down).
export async function GET() {
  return NextResponse.json({ ok: true });
}
