import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PayPalDriver } from "@/lib/payments/paypal-driver";

describe("PayPalDriver", () => {
  const originalEnv = {
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.PAYPAL_CLIENT_ID = "client_test_id";
    process.env.PAYPAL_CLIENT_SECRET = "client_test_secret";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.PAYPAL_CLIENT_ID = originalEnv.PAYPAL_CLIENT_ID;
    process.env.PAYPAL_CLIENT_SECRET = originalEnv.PAYPAL_CLIENT_SECRET;
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
    return { ok, status, json: async () => body };
  }

  function mockTokenThen(...responses: Array<ReturnType<typeof jsonResponse>>) {
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "A.fake.token" }));
    for (const response of responses) {
      fetchMock.mockResolvedValueOnce(response);
    }
  }

  it("creates an order and returns the approve link as qrPayload", async () => {
    mockTokenThen(
      jsonResponse({
        id: "order_123",
        status: "CREATED",
        links: [
          { rel: "self", href: "https://api.paypal.com/v2/checkout/orders/order_123" },
          { rel: "approve", href: "https://www.paypal.com/checkoutnow?token=order_123" },
        ],
      }),
    );

    const driver = new PayPalDriver();
    const result = await driver.createCharge({ amount: 60, currency: "thb", method: "paypal" });

    expect(result).toEqual({
      gatewayReference: "order_123",
      status: "pending",
      qrPayload: "https://www.paypal.com/checkoutnow?token=order_123",
    });

    // Second fetch call is the order-create request — verify the decimal
    // amount string (not Omise-style smallest-subunit integer).
    const [, createRequestInit] = fetchMock.mock.calls[1];
    const body = JSON.parse(createRequestInit.body);
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "THB", value: "60.00" });
    expect(body.intent).toBe("CAPTURE");
  });

  it("rejects an unsupported method before ever calling PayPal", async () => {
    const driver = new PayPalDriver();
    await expect(
      driver.createCharge({ amount: 60, currency: "thb", method: "card" }),
    ).rejects.toThrow("unsupported method");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports pending while the payer hasn't approved yet (no capture attempted)", async () => {
    mockTokenThen(jsonResponse({ id: "order_123", status: "CREATED" }));

    const driver = new PayPalDriver();
    const result = await driver.getChargeStatus("order_123");

    expect(result).toEqual({ status: "pending" });
    expect(fetchMock).toHaveBeenCalledTimes(2); // token + GET order, no capture call
  });

  it("captures the order once the payer has approved it, and reports succeeded", async () => {
    mockTokenThen(
      jsonResponse({ id: "order_123", status: "APPROVED" }),
      jsonResponse({ status: "COMPLETED" }),
    );

    const driver = new PayPalDriver();
    const result = await driver.getChargeStatus("order_123");

    expect(result).toEqual({ status: "succeeded" });
    const [captureUrl, captureInit] = fetchMock.mock.calls[2];
    expect(captureUrl).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/order_123/capture");
    expect(captureInit.method).toBe("POST");
  });

  it("reports failed with no capture attempt when the order was voided", async () => {
    mockTokenThen(jsonResponse({ id: "order_123", status: "VOIDED" }));

    const driver = new PayPalDriver();
    const result = await driver.getChargeStatus("order_123");

    expect(result.status).toBe("failed");
    expect(fetchMock).toHaveBeenCalledTimes(2); // token + GET order, no capture call
  });

  it("reports failed when the capture itself is declined", async () => {
    mockTokenThen(
      jsonResponse({ id: "order_123", status: "APPROVED" }),
      jsonResponse({ status: "DECLINED" }),
    );

    const driver = new PayPalDriver();
    const result = await driver.getChargeStatus("order_123");

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("declined");
  });

  it("already-completed orders report succeeded without ever calling capture again", async () => {
    mockTokenThen(jsonResponse({ id: "order_123", status: "COMPLETED" }));

    const driver = new PayPalDriver();
    const result = await driver.getChargeStatus("order_123");

    expect(result).toEqual({ status: "succeeded" });
    expect(fetchMock).toHaveBeenCalledTimes(2); // token + GET order, no capture call
  });

  it("throws PayPal's own error detail when order creation fails", async () => {
    mockTokenThen(
      jsonResponse({ details: [{ description: "Invalid currency_code" }] }, false),
    );

    const driver = new PayPalDriver();
    await expect(
      driver.createCharge({ amount: 60, currency: "thb", method: "paypal" }),
    ).rejects.toThrow("Invalid currency_code");
  });
});
