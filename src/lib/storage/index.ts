import type { StorageDriver } from "./types";
import { LocalStorageDriver } from "./local-driver";
import { R2StorageDriver } from "./r2-driver";

export type { StorageDriver } from "./types";

let cached: StorageDriver | null = null;

// STORAGE_DRIVER unset/"local" (the default) keeps local dev and any
// deployment that hasn't set up R2 yet working exactly as before — R2 is
// opt-in via env, never required. Cached since the R2 driver's
// constructor validates its own env vars and builds an S3Client once.
export function getStorageDriver(): StorageDriver {
  if (cached) return cached;

  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "r2") {
    cached = new R2StorageDriver();
  } else if (driver === "local") {
    cached = new LocalStorageDriver();
  } else {
    throw new Error(`Unknown STORAGE_DRIVER: ${driver} (expected "local" or "r2")`);
  }
  return cached;
}

// Test-only reset — getStorageDriver() caches its instance at module
// scope, which would otherwise leak a driver built for one test's env
// vars into the next.
export function _resetStorageDriverForTests(): void {
  cached = null;
}
