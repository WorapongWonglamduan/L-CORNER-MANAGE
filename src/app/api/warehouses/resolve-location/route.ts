import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { isMapsShortLink, parseMapsLink } from "@/lib/parse-maps-link";

// POST /api/warehouses/resolve-location - follows a Google Maps short link's
// redirect server-side and extracts lat/long from the resolved URL. The
// hostname allow-list below is a hard SSRF guard — this endpoint must never
// fetch an arbitrary user-supplied URL.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !isMapsShortLink(url)) {
      return NextResponse.json(
        { error: "Only Google Maps short links (maps.app.goo.gl, goo.gl, g.co) can be resolved" },
        { status: 400 },
      );
    }

    const response = await fetch(url, { redirect: "follow" });
    const resolvedUrl = response.url;

    const coords = parseMapsLink(resolvedUrl);
    if (!coords) {
      return NextResponse.json(
        { error: "Could not find coordinates in the resolved link" },
        { status: 400 },
      );
    }

    return NextResponse.json(coords);
  } catch (error) {
    console.error("Error resolving map link:", error);
    return NextResponse.json(
      { error: "Failed to resolve map link" },
      { status: 500 },
    );
  }
}
