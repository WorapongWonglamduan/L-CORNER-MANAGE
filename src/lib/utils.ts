import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// crypto.randomUUID is only exposed by browsers in a secure context
// (https:// or localhost) — plain http on a raw IP (e.g. testing before
// HTTPS/a domain is set up) throws "crypto.randomUUID is not a function".
// Falls back to a non-cryptographic UUID v4, fine for IDs only used for
// client-side uniqueness (idempotency keys, print-job IDs), never security.
export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
