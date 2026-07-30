import type { PaymentDriver } from "./types";
import { OmiseDriver } from "./omise-driver";
import { TwoCTwoPDriver } from "./2c2p-driver";
import { PayPalDriver } from "./paypal-driver";
import { TrueMoneyDriver } from "./truemoney-driver";
import { RabbitLinePayDriver } from "./rabbit-linepay-driver";

export type { PaymentDriver } from "./types";

// Unlike getStorageDriver() (one env-selected driver at a time), several
// payment drivers can coexist — a PaymentIntent already carries which one
// it used (`driver` column), so lookup is by name, cached per name rather
// than a single global instance.
const cache = new Map<string, PaymentDriver>();

const FACTORIES: Record<string, () => PaymentDriver> = {
  omise: () => new OmiseDriver(),
  "2c2p": () => new TwoCTwoPDriver(),
  paypal: () => new PayPalDriver(),
  truemoney: () => new TrueMoneyDriver(),
  rabbit_line_pay: () => new RabbitLinePayDriver(),
};

export function getPaymentDriver(driverName: string): PaymentDriver {
  const cached = cache.get(driverName);
  if (cached) return cached;

  const factory = FACTORIES[driverName];
  if (!factory) {
    throw new Error(`Unknown payment driver: ${driverName}`);
  }

  const driver = factory();
  cache.set(driverName, driver);
  return driver;
}

/** Test-only — clears the cache so a driver constructed against one set of
 * env vars doesn't leak into a test that changed them (mirrors
 * `_resetStorageDriverForTests`). */
export function _resetPaymentDriversForTests(): void {
  cache.clear();
}
