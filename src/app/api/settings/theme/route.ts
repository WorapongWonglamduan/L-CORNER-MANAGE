import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { getThemeColors } from "@/lib/theme-settings";
import { prisma } from "@/lib/prisma";
import { THEME_PRESETS } from "@/constants/theme-presets";
import { deriveThemeShades, isHexColor } from "@/lib/color-utils";

// GET /api/settings/theme - ดึงค่าสีธีมปัจจุบัน
export async function GET() {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.view");
    if (denied) return denied;

    const theme = await getThemeColors();
    return NextResponse.json(theme);
  } catch (error) {
    console.error("Error fetching theme settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch theme settings" },
      { status: 500 },
    );
  }
}

// PUT /api/settings/theme - เปลี่ยนสีธีม (เลือกจาก preset หรือกำหนดเอง)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "settings.update");
    if (denied) return denied;
    const shopId = session!.user.shop_id;
    if (!shopId) {
      return NextResponse.json({ error: "No shop assigned" }, { status: 403 });
    }

    const body = await request.json();
    const { preset_id, custom_color } = body;

    let colors: {
      theme_color: string;
      theme_color_light: string;
      theme_color_dark: string;
    };

    if (custom_color) {
      // Free-form pick: validate it's a real hex color, then derive the
      // light/dark companion shades this app's gradients need.
      if (!isHexColor(custom_color)) {
        return NextResponse.json(
          { error: "custom_color must be a hex color like #213559" },
          { status: 400 },
        );
      }
      colors = deriveThemeShades(custom_color);
    } else {
      // Curated preset — pre-verified for contrast against white text.
      const preset = THEME_PRESETS.find((p) => p.id === preset_id);
      if (!preset) {
        return NextResponse.json(
          { error: "Invalid theme preset" },
          { status: 400 },
        );
      }
      colors = {
        theme_color: preset.theme_color,
        theme_color_light: preset.theme_color_light,
        theme_color_dark: preset.theme_color_dark,
      };
    }

    const settings = await prisma.appSettings.upsert({
      where: { shop_id: shopId },
      update: colors,
      create: { shop_id: shopId, ...colors },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating theme settings:", error);
    return NextResponse.json(
      { error: "Failed to update theme settings" },
      { status: 500 },
    );
  }
}
