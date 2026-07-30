import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { getPaymentDriver } from "@/lib/payments";
import { createCompletedSale, SaleCreationError } from "@/lib/sales/create-sale";
import type { CreateSaleInput } from "@/lib/sales/create-sale";
import type { Locale } from "@/types/i18n";
import { Prisma } from "@prisma/client";

/**
 * The single source of truth for "has this PaymentIntent actually been
 * paid" — called by BOTH the poll endpoint (GET /api/payments/intents/[id])
 * and the webhook endpoint (POST /api/payments/webhooks/[driver]). Never
 * trusts a webhook payload's own status field; always re-asks the gateway
 * itself via `driver.getChargeStatus()`, per Omise's own documented advice
 * to re-fetch rather than trust the event body — a forged or duplicated
 * webhook can, at worst, trigger a wasted re-check, never fabricate a
 * success.
 *
 * Safe to call twice (a webhook retry, a poll racing a webhook, a
 * crash-recovery retry): `createCompletedSale`'s existing idempotency
 * mechanism (keyed on `PaymentIntent.id`) makes a second call a pure no-op
 * that returns the already-created Sale — `PaymentIntent.status`/`sale_id`
 * are a best-effort cache for the polling UI, not a concurrency-control
 * mechanism. `Sale` actually existing is the real truth.
 */
export async function reconcileIntent(intentId: string) {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: intentId },
    include: { sale: true },
  });
  if (!intent) return null;

  // Already resolved with a Sale attached — nothing left to check.
  if (intent.status === "succeeded" && intent.sale_id) {
    return intent;
  }

  if (!intent.gateway_reference) {
    // The driver's createCharge() never got far enough to receive a
    // reference — nothing to reconcile against yet.
    return intent;
  }

  const driver = getPaymentDriver(intent.driver);
  const chargeStatus = await driver.getChargeStatus(intent.gateway_reference);

  if (chargeStatus.status === "pending") {
    return intent;
  }

  if (chargeStatus.status === "failed") {
    return markIntentFailed(intent.id, chargeStatus.failureReason ?? "Payment failed");
  }

  // chargeStatus.status === "succeeded" — the gateway has confirmed this is
  // real, captured money. Finalize into an actual Sale.
  const locale: Locale = "th";
  const [t, tPromo] = await Promise.all([
    getTranslations({ locale, namespace: "sales.errors" }),
    getTranslations({ locale, namespace: "promotions.errors" }),
  ]);

  try {
    const { sale } = await createCompletedSale(
      intent.cart_snapshot as unknown as CreateSaleInput,
      intent.id,
      { locale, t, tPromo, createdBy: intent.created_by },
    );

    // Guarded to never regress an already-succeeded intent (there's nothing
    // to regress FROM here, since createCompletedSale only reaches this
    // point once) — deliberately NOT restricted to `status: "pending"`,
    // since expireIfStale may have already flipped this to "expired" while
    // the payment was still genuinely settling. A late-arriving success
    // must still record sale_id here regardless of that stale label, or the
    // polling UI would never learn the sale it just created actually
    // exists.
    await prisma.paymentIntent.updateMany({
      where: { id: intent.id, status: { not: "succeeded" } },
      data: { status: "succeeded", sale_id: sale.id, failure_reason: null },
    });

    return prisma.paymentIntent.findUnique({ where: { id: intent.id }, include: { sale: true } });
  } catch (error) {
    // The gateway confirms this money was actually captured, but turning it
    // into a Sale failed for a business reason (stock or the promotion was
    // exhausted during the minutes this payment sat pending) — there is no
    // transaction that can undo a charge the gateway already settled. Mark
    // it failed but KEEP gateway_reference, so this is distinguishable from
    // "failed before ever paying": a captured charge with no Sale means
    // staff must go refund it manually via the gateway's own dashboard/API.
    const message = error instanceof SaleCreationError ? error.message : "Failed to create sale";
    console.error(`reconcileIntent: payment captured but sale creation failed for intent ${intent.id}:`, error);
    return markIntentFailed(intent.id, `Payment captured but sale creation failed: ${message}`);
  }
}

async function markIntentFailed(intentId: string, failureReason: string) {
  // Same not-succeeded guard as the success path above — a failed/expired
  // intent can still be marked failed again (harmless), but a succeeded one
  // (a Sale already exists) must never be overwritten.
  await prisma.paymentIntent.updateMany({
    where: { id: intentId, status: { not: "succeeded" } },
    data: { status: "failed", failure_reason: failureReason },
  });
  return prisma.paymentIntent.findUnique({ where: { id: intentId }, include: { sale: true } });
}

/** Lazily flips a stale pending intent to "expired" for UI purposes only —
 * mirrors this codebase's existing check-at-use-time expiry idiom (e.g.
 * `Promotion.expires_at`, checked when a code is applied, never actively
 * swept). Must never gate `reconcileIntent` itself: if a late webhook or
 * poll tick discovers the gateway actually says succeeded after this fired,
 * finalize it anyway — real captured money always wins over a stale label. */
export async function expireIfStale(intentId: string): Promise<void> {
  await prisma.paymentIntent.updateMany({
    where: {
      id: intentId,
      status: "pending",
      expires_at: { lt: new Date() },
    },
    data: { status: "expired" },
  });
}

export type ReconcileIntentResult = Prisma.PromiseReturnType<typeof reconcileIntent>;
