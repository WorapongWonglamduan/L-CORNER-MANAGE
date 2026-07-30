import { describe, it, expect } from "vitest";
import { normalizeMediaUrl } from "@/lib/media-url";

// Real bug this locks in: switching STORAGE_DRIVER to r2 made every
// product image request 404 — the old normalization unconditionally
// prepended "/" to any path not already starting with one, which is
// correct for a local-driver relative path but turns an R2 driver's full
// "https://pub-xxx.r2.dev/uploads/..." URL into the broken same-origin
// path "/https://pub-xxx.r2.dev/uploads/...".
describe("normalizeMediaUrl", () => {
  it("leaves an absolute https URL (R2) untouched", () => {
    expect(normalizeMediaUrl("https://pub-abc123.r2.dev/uploads/2026/07/products/original/x.jpg")).toBe(
      "https://pub-abc123.r2.dev/uploads/2026/07/products/original/x.jpg",
    );
  });

  it("leaves an absolute http URL untouched", () => {
    expect(normalizeMediaUrl("http://images.example.com/uploads/x.jpg")).toBe(
      "http://images.example.com/uploads/x.jpg",
    );
  });

  it("adds a leading slash to a bare relative path (local driver)", () => {
    expect(normalizeMediaUrl("uploads/2026/07/products/original/x.jpg")).toBe(
      "/uploads/2026/07/products/original/x.jpg",
    );
  });

  it("leaves an already-leading-slash relative path untouched", () => {
    expect(normalizeMediaUrl("/uploads/2026/07/products/original/x.jpg")).toBe(
      "/uploads/2026/07/products/original/x.jpg",
    );
  });

  it("converts Windows backslashes to forward slashes for a relative path", () => {
    expect(normalizeMediaUrl("uploads\\2026\\07\\products\\original\\x.jpg")).toBe(
      "/uploads/2026/07/products/original/x.jpg",
    );
  });

  it("returns an empty string for null/undefined", () => {
    expect(normalizeMediaUrl(null)).toBe("");
    expect(normalizeMediaUrl(undefined)).toBe("");
  });
});
