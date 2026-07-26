import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { getLocale, getTranslations } from "next-intl/server";
import type { I18nText, Locale } from "@/types/i18n";

// POST /api/promotions/validate - เช็คโค้ดโปรโมชั่นก่อนใช้ที่หน้า POS (ไม่ตัด used_count จริง)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "sales.create");
    if (denied) return denied;

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations({ locale, namespace: "promotions.errors" });

    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) {
      return NextResponse.json({ error: t("codeRequired") }, { status: 400 });
    }

    const promotion = await prisma.promotion.findUnique({
      where: { code: String(code).toUpperCase() },
    });

    if (!promotion) {
      return NextResponse.json({ error: t("notFound") }, { status: 404 });
    }

    if (!promotion.is_active) {
      return NextResponse.json({ error: t("inactive") }, { status: 400 });
    }

    if (promotion.expires_at && promotion.expires_at < new Date()) {
      return NextResponse.json({ error: t("expired") }, { status: 400 });
    }

    if (promotion.max_uses !== null && promotion.used_count >= promotion.max_uses) {
      return NextResponse.json({ error: t("usageLimitReached") }, { status: 400 });
    }

    const baseAmount = Number(subtotal) || 0;
    const discountAmount =
      promotion.discount_type === "percentage"
        ? (baseAmount * Number(promotion.discount_value)) / 100
        : Math.min(Number(promotion.discount_value), baseAmount);

    return NextResponse.json({
      valid: true,
      promotion_id: promotion.id,
      code: promotion.code,
      name: (promotion.name_i18n as unknown as I18nText)[locale],
      discount_type: promotion.discount_type,
      discount_value: Number(promotion.discount_value),
      discount_amount: discountAmount,
    });
  } catch (error) {
    console.error("Error validating promotion:", error);
    return NextResponse.json(
      { error: "Failed to validate promotion code" },
      { status: 500 },
    );
  }
}
