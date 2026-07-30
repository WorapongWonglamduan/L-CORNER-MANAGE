import { describe, it, expect } from "vitest";
import { parsePageSize } from "@/lib/pagination";

// Every GET list endpoint used to read pageSize with no upper bound, so a
// client could force an unbounded/expensive query with `pageSize=999999999`.
describe("parsePageSize", () => {
  it("returns the requested size when within bounds", () => {
    expect(parsePageSize(new URLSearchParams("pageSize=25"))).toBe(25);
  });

  it("clamps an oversized pageSize to the maximum", () => {
    expect(parsePageSize(new URLSearchParams("pageSize=999999999"))).toBe(100);
  });

  it("falls back to the default when pageSize is missing", () => {
    expect(parsePageSize(new URLSearchParams(""), 20)).toBe(20);
  });

  it("falls back to the default for a non-numeric or non-positive value", () => {
    expect(parsePageSize(new URLSearchParams("pageSize=abc"), 10)).toBe(10);
    expect(parsePageSize(new URLSearchParams("pageSize=0"), 10)).toBe(10);
    expect(parsePageSize(new URLSearchParams("pageSize=-5"), 10)).toBe(10);
  });
});
