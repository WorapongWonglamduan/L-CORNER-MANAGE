export interface LatLong {
  latitude: number;
  longitude: number;
}

// Domains Google issues short links from — an allow-list for the server-side
// redirect-resolve step in /api/warehouses/resolve-location. Never fetch an
// arbitrary user-supplied URL server-side without this check (SSRF).
export const MAPS_SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl", "g.co"];

export function isMapsShortLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return MAPS_SHORT_LINK_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

const isValidLatLong = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Extracts a {latitude, longitude} pair from a Google Maps URL. Tries the
 * more precise patterns first (an exact dropped-pin location) before the
 * `@lat,lng,zoom` pattern, which is only the current map *view* center and
 * can differ slightly from an actual saved marker when a URL carries both:
 * - `!3d<lat>!4d<lng>` — precise place-marker segment (place/business URLs)
 * - `/search/<lat>,+<lng>` — dropped-pin "Share" links resolve here (the
 *   `+` is a literal, unencoded space in this URL's path, not `%20`)
 * - `?q=<lat>,<lng>` — older query-param form
 * - `@<lat>,<lng>,<zoom>z` — map view center; last since least precise
 * Returns null if none match — never throws on a malformed URL.
 */
export function parseMapsLink(url: string): LatLong | null {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (isValidLatLong(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}
