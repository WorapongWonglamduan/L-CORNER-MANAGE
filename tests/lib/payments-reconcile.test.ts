import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedBasics, resetDb } from "../helpers/fixtures";
import { reconcileIntent } from "@/lib/payments/reconcile";
import { _resetPaymentDriversForTests } from "@/lib/payments";

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// The OmiseDriver's real constructor calls requireEnv("OMISE_SECRET_KEY"),
// which would throw with no env configured — mock the whole module so the
// factory's `new OmiseDriver()` resolves to a controllable fake instead. A
// real `class` (not an arrow function) is required here — `new` on an arrow
// function throws "is not a constructor". Declared via vi.hoisted() since
// vi.mock's factory is itself hoisted above ordinary top-level code.
const { getChargeStatus, FakeOmiseDriver } = vi.hoisted(() => {
  const getChargeStatus = vi.fn();
  class FakeOmiseDriver {
    createCharge = vi.fn();
    getChargeStatus = getChargeStatus;
    verifyWebhookSignature = vi.fn().mockReturnValue(false);
    parseWebhookEvent = vi.fn().mockReturnValue(null);
  }
  return { getChargeStatus, FakeOmiseDriver };
});
vi.mock("@/lib/payments/omise-driver", () => ({
  OmiseDriver: FakeOmiseDriver,
}));

// reconcileIntent is the one function that's allowed to turn a PaymentIntent
// into a real Sale — these tests are the actual money-safety guarantee of
// the whole gateway-payment feature: never fabricate a success from
// anything other than the gateway's own getChargeStatus, never double-create
// a Sale or double-deduct stock no matter how many times it's called, and
// never lose track of captured money if Sale creation itself fails.
describe("reconcileIntent", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(10);
    getChargeStatus.mockReset();
    _resetPaymentDriversForTests();
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createIntent(overrides: { gateway_reference?: string | null } = {}) {
    return prisma.paymentIntent.create({
      data: {
        driver: "omise",
        method: "promptpay",
        warehouse_id: fx.warehouseId,
        amount: 20,
        gateway_reference: `chrg_test_${Math.random().toString(36).slice(2)}`,
        cart_snapshot: {
          warehouse_id: fx.warehouseId,
          items: [{ product_id: fx.productId, quantity: 1 }],
        },
        created_by: fx.userId,
        ...overrides,
      },
    });
  }

  it("does nothing while the gateway still reports pending", async () => {
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "pending" });

    const result = await reconcileIntent(intent.id);

    expect(result?.status).toBe("pending");
    expect(result?.sale_id).toBeNull();
    expect(await prisma.sale.count()).toBe(0);
  });

  it("creates exactly one Sale when the gateway reports succeeded", async () => {
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "succeeded" });

    const result = await reconcileIntent(intent.id);

    expect(result?.status).toBe("succeeded");
    expect(result?.sale_id).not.toBeNull();
    expect(await prisma.sale.count()).toBe(1);

    const stock = await prisma.productStock.findUnique({
      where: { product_id_warehouse_id: { product_id: fx.productId, warehouse_id: fx.warehouseId } },
    });
    expect(Number(stock?.current_stock)).toBe(9); // 10 - 1 sold
  });

  it("never double-creates a Sale or double-deducts stock when called twice", async () => {
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "succeeded" });

    await reconcileIntent(intent.id);
    const second = await reconcileIntent(intent.id);

    expect(await prisma.sale.count()).toBe(1);
    const stock = await prisma.productStock.findUnique({
      where: { product_id_warehouse_id: { product_id: fx.productId, warehouse_id: fx.warehouseId } },
    });
    expect(Number(stock?.current_stock)).toBe(9);
    expect(second?.sale_id).not.toBeNull();
  });

  it("marks the intent failed (with gateway_reference kept) when the gateway confirms success but Sale creation fails — never fabricates a Sale for money it can't fulfill", async () => {
    // Simulate the exact "captured money, no fulfillable sale" gap: stock
    // sells out between intent creation and reconciliation.
    await prisma.productStock.update({
      where: { product_id_warehouse_id: { product_id: fx.productId, warehouse_id: fx.warehouseId } },
      data: { current_stock: 0 },
    });
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "succeeded" });

    const result = await reconcileIntent(intent.id);

    expect(result?.status).toBe("failed");
    expect(result?.sale_id).toBeNull();
    expect(result?.gateway_reference).not.toBeNull(); // the "needs manual refund" signal
    expect(result?.failure_reason).toBeTruthy();
    expect(await prisma.sale.count()).toBe(0);

    const stock = await prisma.productStock.findUnique({
      where: { product_id_warehouse_id: { product_id: fx.productId, warehouse_id: fx.warehouseId } },
    });
    expect(Number(stock?.current_stock)).toBe(0); // untouched, not further corrupted
  });

  it("marks the intent failed when the gateway itself reports failed", async () => {
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "failed", failureReason: "insufficient_funds" });

    const result = await reconcileIntent(intent.id);

    expect(result?.status).toBe("failed");
    expect(result?.failure_reason).toBe("insufficient_funds");
    expect(await prisma.sale.count()).toBe(0);
  });

  it("a late success after the intent was already marked failed still finalizes into a Sale — real captured money always wins", async () => {
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "failed", failureReason: "temporary error" });
    await reconcileIntent(intent.id);

    getChargeStatus.mockResolvedValue({ status: "succeeded" });
    const result = await reconcileIntent(intent.id);

    expect(result?.status).toBe("succeeded");
    expect(result?.sale_id).not.toBeNull();
    expect(await prisma.sale.count()).toBe(1);
  });

  it("short-circuits without calling the gateway once already succeeded with a sale attached", async () => {
    const intent = await createIntent();
    getChargeStatus.mockResolvedValue({ status: "succeeded" });
    await reconcileIntent(intent.id);
    getChargeStatus.mockClear();

    await reconcileIntent(intent.id);

    expect(getChargeStatus).not.toHaveBeenCalled();
  });

  it("returns the intent unchanged when there's no gateway_reference yet (createCharge never completed)", async () => {
    const intent = await createIntent({ gateway_reference: null });

    const result = await reconcileIntent(intent.id);

    expect(result?.status).toBe("pending");
    expect(getChargeStatus).not.toHaveBeenCalled();
  });
});
