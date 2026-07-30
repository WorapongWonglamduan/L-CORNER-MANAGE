import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as createIntent } from "@/app/api/payments/intents/route";
import { GET as pollIntent } from "@/app/api/payments/intents/[id]/route";
import { fakeSession, seedBasics, currentStock, resetDb } from "../helpers/fixtures";
import { _resetPaymentDriversForTests } from "@/lib/payments";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("th"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// vi.mock's factory is hoisted above ordinary top-level code, so anything it
// closes over must be declared via vi.hoisted() too — a real `class` (not an
// arrow function) is required for `new OmiseDriver()` to work.
const { createCharge, getChargeStatus, FakeOmiseDriver } = vi.hoisted(() => {
  const createCharge = vi.fn();
  const getChargeStatus = vi.fn();
  class FakeOmiseDriver {
    createCharge = createCharge;
    getChargeStatus = getChargeStatus;
    verifyWebhookSignature = vi.fn().mockReturnValue(false);
    parseWebhookEvent = vi.fn().mockReturnValue(null);
  }
  return { createCharge, getChargeStatus, FakeOmiseDriver };
});
vi.mock("@/lib/payments/omise-driver", () => ({ OmiseDriver: FakeOmiseDriver }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

function intentRequest(body: unknown) {
  return new NextRequest("http://localhost/api/payments/intents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/intents + GET /api/payments/intents/[id]", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;

  beforeEach(async () => {
    fx = await seedBasics(10);
    mockedAuth.mockResolvedValue(
      fakeSession({
        userId: fx.userId,
        warehouseIds: [fx.warehouseId],
        permissions: ["sales.create", "sales.view"],
      }),
    );
    createCharge.mockReset();
    getChargeStatus.mockReset();
    _resetPaymentDriversForTests();
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("finalizes into a Sale in one round-trip for a synchronous (card) charge", async () => {
    createCharge.mockResolvedValue({ gatewayReference: "chrg_test_card", status: "succeeded" });
    getChargeStatus.mockResolvedValue({ status: "succeeded" });

    const res = await createIntent(
      intentRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 2 }],
        driver: "omise",
        method: "card",
        card_token: "tokn_test_123",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("succeeded");
    expect(body.sale_id).not.toBeNull();
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(8); // 10 - 2
  });

  it("returns a pending intent (with qr_image_url) for an async method, without creating a Sale yet", async () => {
    createCharge.mockResolvedValue({
      gatewayReference: "chrg_test_promptpay",
      status: "pending",
      qrImageUrl: "https://api.omise.co/qr/fake.png",
    });

    const res = await createIntent(
      intentRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 1 }],
        driver: "omise",
        method: "promptpay",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.qr_image_url).toBe("https://api.omise.co/qr/fake.png");
    expect(body.sale_id).toBeNull();
    expect(await prisma.sale.count()).toBe(0);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(10); // untouched
  });

  it("rejects a request for a warehouse the caller has no access to", async () => {
    const other = await prisma.warehouse.create({
      data: { code: `WHT2-${fx.userId.slice(0, 8)}`, name_i18n: { th: "คลัง 2", en: "Warehouse 2" } },
    });

    const res = await createIntent(
      intentRequest({
        warehouse_id: other.id,
        items: [{ product_id: fx.productId, quantity: 1 }],
        driver: "omise",
        method: "card",
        card_token: "tokn_test_123",
      }),
    );

    expect(res.status).toBe(403);
  });

  it("marks the intent failed (not 500) if the gateway rejects the charge outright", async () => {
    createCharge.mockRejectedValue(new Error("card_declined"));

    const res = await createIntent(
      intentRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 1 }],
        driver: "omise",
        method: "card",
        card_token: "tokn_test_bad",
      }),
    );

    expect(res.status).toBe(502);
    const intents = await prisma.paymentIntent.findMany({ where: { warehouse_id: fx.warehouseId } });
    expect(intents).toHaveLength(1);
    expect(intents[0].status).toBe("failed");
    expect(intents[0].failure_reason).toBe("card_declined");
  });

  it("GET poll picks up a success that happened after the intent was created pending", async () => {
    createCharge.mockResolvedValue({
      gatewayReference: "chrg_test_promptpay_2",
      status: "pending",
      qrImageUrl: "https://api.omise.co/qr/fake2.png",
    });
    const createRes = await createIntent(
      intentRequest({
        warehouse_id: fx.warehouseId,
        items: [{ product_id: fx.productId, quantity: 3 }],
        driver: "omise",
        method: "promptpay",
      }),
    );
    const created = await createRes.json();
    expect(created.status).toBe("pending");

    // The customer scans and pays; Omise now reports success on the next check.
    getChargeStatus.mockResolvedValue({ status: "succeeded" });

    const pollRes = await pollIntent(
      new NextRequest(`http://localhost/api/payments/intents/${created.id}`),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(pollRes.status).toBe(200);
    const polled = await pollRes.json();
    expect(polled.status).toBe("succeeded");
    expect(polled.sale.id).toBe(polled.sale_id);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(7); // 10 - 3

    // A second poll must not double-deduct.
    const secondPollRes = await pollIntent(
      new NextRequest(`http://localhost/api/payments/intents/${created.id}`),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect((await secondPollRes.json()).sale_id).toBe(polled.sale_id);
    expect(await currentStock(fx.productId, fx.warehouseId)).toBe(7);
  });

  it("GET poll denies access to a different warehouse's intent", async () => {
    const other = await prisma.warehouse.create({
      data: { code: `WHT3-${fx.userId.slice(0, 8)}`, name_i18n: { th: "คลัง 3", en: "Warehouse 3" } },
    });
    const otherIntent = await prisma.paymentIntent.create({
      data: {
        driver: "omise",
        method: "promptpay",
        warehouse_id: other.id,
        amount: 10,
        cart_snapshot: { warehouse_id: other.id, items: [] },
      },
    });

    const res = await pollIntent(
      new NextRequest(`http://localhost/api/payments/intents/${otherIntent.id}`),
      { params: Promise.resolve({ id: otherIntent.id }) },
    );
    expect(res.status).toBe(403);
  });
});
