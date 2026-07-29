// In-memory per-email login lockout. There was no brute-force protection
// on login at all (MAX_LOGIN_ATTEMPTS in env.template was defined but never
// wired up), so a known email could be password-guessed with unlimited
// attempts. A module-level Map is fine for this app's single-instance VPS
// deployment; it resets on restart and doesn't share state across
// instances, which is an acceptable trade-off at this scale (a distributed
// store would be over-engineering here).
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10);
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

export function isLockedOut(email: string): boolean {
  const entry = failedLoginAttempts.get(email);
  return !!entry?.lockedUntil && entry.lockedUntil > Date.now();
}

export function recordFailedLogin(email: string): void {
  const entry = failedLoginAttempts.get(email) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  failedLoginAttempts.set(email, entry);
}

export function clearFailedLogins(email: string): void {
  failedLoginAttempts.delete(email);
}

// Test-only reset — the Map is module-level state shared across every
// import, which would otherwise leak between test cases.
export function _resetForTests(): void {
  failedLoginAttempts.clear();
}
