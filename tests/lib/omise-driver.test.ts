import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OmiseDriver } from "@/lib/payments/omise-driver";

// Exercises the real OmiseDriver against a mocked global fetch — the
// intents/reconcile tests elsewhere in this suite replace OmiseDriver
// entirely with a fake, so they never actually verify the request bodies
// this class builds or how it parses Omise's response shape.
describe("OmiseDriver", () => {
  const originalSecretKey = process.env.OMISE_SECRET_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.OMISE_SECRET_KEY = "skey_test_fake";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.OMISE_SECRET_KEY = originalSecretKey;
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, ok = true) {
    return { ok, status: ok ? 200 : 400, json: async () => body };
  }

  it("builds a promptpay source charge and extracts the QR image URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: "chrg_test_pp",
        status: "pending",
        source: { scannable_code: { image: { download_uri: "https://api.omise.co/qr/pp.png" } } },
      }),
    );

    const driver = new OmiseDriver();
    const result = await driver.createCharge({ amount: 60, currency: "thb", method: "promptpay" });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      amount: 6000,
      currency: "thb",
      source: { type: "promptpay" },
    });
    expect(result).toEqual({
      gatewayReference: "chrg_test_pp",
      status: "pending",
      qrImageUrl: "https://api.omise.co/qr/pp.png",
      failureReason: undefined,
    });
  });

  it("builds a truemoney_qr source charge with the same response shape as promptpay", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: "chrg_test_tmn",
        status: "pending",
        source: { scannable_code: { image: { download_uri: "https://api.omise.co/qr/tmn.png" } } },
      }),
    );

    const driver = new OmiseDriver();
    const result = await driver.createCharge({ amount: 60, currency: "thb", method: "truemoney_qr" });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      amount: 6000,
      currency: "thb",
      source: { type: "truemoney_qr" },
    });
    expect(result.status).toBe("pending");
    expect(result.qrImageUrl).toBe("https://api.omise.co/qr/tmn.png");
  });

  it("builds a card charge from a client-tokenized card", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "chrg_test_card", status: "successful" }));

    const driver = new OmiseDriver();
    const result = await driver.createCharge({
      amount: 100,
      currency: "thb",
      method: "card",
      cardToken: "tokn_test_abc",
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({ amount: 10000, card: "tokn_test_abc" });
    expect(result.status).toBe("succeeded");
  });

  it("rejects a card charge with no cardToken", async () => {
    const driver = new OmiseDriver();
    await expect(
      driver.createCharge({ amount: 100, currency: "thb", method: "card" }),
    ).rejects.toThrow("cardToken is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported method before ever calling Omise", async () => {
    const driver = new OmiseDriver();
    await expect(
      driver.createCharge({ amount: 100, currency: "thb", method: "bitcoin" }),
    ).rejects.toThrow("unsupported method");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Omise's 5-state charge status onto this app's 3-state model", async () => {
    const driver = new OmiseDriver();
    const cases: Array<[string, string]> = [
      ["successful", "succeeded"],
      ["pending", "pending"],
      ["failed", "failed"],
      ["expired", "failed"],
      ["reversed", "failed"],
    ];

    for (const [omiseStatus, expected] of cases) {
      fetchMock.mockResolvedValue(jsonResponse({ status: omiseStatus }));
      const result = await driver.getChargeStatus("chrg_test_x");
      expect(result.status).toBe(expected);
    }
  });

  it("throws with Omise's own error message when the API call fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "invalid card token" }, false));

    const driver = new OmiseDriver();
    await expect(
      driver.createCharge({ amount: 100, currency: "thb", method: "card", cardToken: "tokn_bad" }),
    ).rejects.toThrow("invalid card token");
  });
});
