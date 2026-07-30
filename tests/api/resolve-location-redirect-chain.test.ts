import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { POST as resolveLocation } from "@/app/api/warehouses/resolve-location/route";
import { fakeSession } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function redirectResponse(location: string) {
  return new Response(null, { status: 302, headers: { location } });
}

function okResponse(finalUrl: string) {
  const res = new Response(null, { status: 200 });
  Object.defineProperty(res, "url", { value: finalUrl });
  return res;
}

// fetch(url, {redirect:"follow"}) only lets the caller see the FINAL
// resolved URL — an attacker-controlled intermediate hop would otherwise be
// followed to an arbitrary host with no check at all. resolve-location must
// validate every hop, not just the first (the short-link) one.
describe("POST /api/warehouses/resolve-location - redirect chain validation", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: "u1", permissions: ["settings.view", "settings.update"] }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function request(url: string) {
    return new NextRequest("http://localhost/api/warehouses/resolve-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  }

  it("rejects a redirect chain that leads to a disallowed host", async () => {
    const fetchMock = vi
      .fn()
      // First hop: the short link redirects somewhere NOT on the allow-list.
      .mockResolvedValueOnce(redirectResponse("http://169.254.169.254/latest/meta-data/"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await resolveLocation(request("https://maps.app.goo.gl/fMigMmdjSQV64oFv7"));
    expect(res.status).toBe(400);
    // Must never have followed the disallowed hop.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a legitimate multi-hop chain that stays within the allow-list", async () => {
    const finalUrl = "https://www.google.com/maps/search/13.757086,+100.504061";
    const fetchMock = vi
      .fn()
      // Hop 1: short link -> an intermediate allow-listed hop.
      .mockResolvedValueOnce(redirectResponse("https://goo.gl/maps/xyz"))
      // Hop 2: that intermediate hop -> the final resolved Google Maps URL.
      .mockResolvedValueOnce(redirectResponse(finalUrl))
      // Hop 3: fetching the final URL itself returns 200 (no more redirects).
      .mockResolvedValueOnce(okResponse(finalUrl));
    vi.stubGlobal("fetch", fetchMock);

    const res = await resolveLocation(request("https://maps.app.goo.gl/fMigMmdjSQV64oFv7"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.latitude).toBeCloseTo(13.757086);
    expect(body.longitude).toBeCloseTo(100.504061);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a URL that isn't a recognized short link before ever fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await resolveLocation(request("https://evil.com/maps.app.goo.gl"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
