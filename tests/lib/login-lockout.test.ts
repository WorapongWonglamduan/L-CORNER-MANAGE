import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { isLockedOut, recordFailedLogin, clearFailedLogins, _resetForTests } from "@/lib/login-lockout";

// Regression coverage for a real gap: login had no brute-force protection
// at all, despite MAX_LOGIN_ATTEMPTS being defined in env.template and
// never wired up. Default MAX_LOGIN_ATTEMPTS is 5 (process.env unset in
// tests).
describe("login lockout", () => {
  beforeEach(() => {
    _resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not locked out before any failed attempts", () => {
    expect(isLockedOut("a@example.com")).toBe(false);
  });

  it("does not lock out after fewer than the max attempts", () => {
    for (let i = 0; i < 4; i++) recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(false);
  });

  it("locks out after reaching the max attempts", () => {
    for (let i = 0; i < 5; i++) recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(true);
  });

  it("tracks each email independently", () => {
    for (let i = 0; i < 5; i++) recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(true);
    expect(isLockedOut("b@example.com")).toBe(false);
  });

  it("clears the lockout on a successful login", () => {
    for (let i = 0; i < 5; i++) recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(true);

    clearFailedLogins("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(false);

    // A fresh run of failures must lock out again — clearing shouldn't
    // leave the count silently pre-loaded.
    for (let i = 0; i < 4; i++) recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(false);
    recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(true);
  });

  it("lifts the lockout once the lockout window has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    for (let i = 0; i < 5; i++) recordFailedLogin("a@example.com");
    expect(isLockedOut("a@example.com")).toBe(true);

    vi.setSystemTime(new Date("2026-01-01T00:16:00Z")); // 16 min later
    expect(isLockedOut("a@example.com")).toBe(false);
  });
});
