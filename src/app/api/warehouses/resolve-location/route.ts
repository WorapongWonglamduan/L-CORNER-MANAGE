import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { isMapsShortLink, isAllowedRedirectHost, parseMapsLink } from "@/lib/parse-maps-link";

const MAX_REDIRECTS = 5;

// Follows a redirect chain one hop at a time (`redirect: "manual"`),
// checking EVERY hop's hostname against the allow-list — `fetch(url,
// {redirect: "follow"})` only lets the caller see/validate the final URL,
// so an attacker-controlled intermediate hop (if one were ever reachable)
// would otherwise be followed to an arbitrary host with no check at all.
async function resolveRedirectChain(startUrl: string): Promise<string> {
  let current = startUrl;
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const response = await fetch(current, { redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      return current;
    }
    const location = response.headers.get("location");
    if (!location) return current;
    const next = new URL(location, current).toString();
    if (!isAllowedRedirectHost(new URL(next).hostname)) {
      throw new Error("REDIRECT_HOST_NOT_ALLOWED");
    }
    current = next;
  }
  return current;
}

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

    let resolvedUrl: string;
    try {
      resolvedUrl = await resolveRedirectChain(url);
    } catch (error) {
      if (error instanceof Error && error.message === "REDIRECT_HOST_NOT_ALLOWED") {
        return NextResponse.json(
          { error: "Redirect chain led to a host outside the allowed list" },
          { status: 400 },
        );
      }
      throw error;
    }

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
