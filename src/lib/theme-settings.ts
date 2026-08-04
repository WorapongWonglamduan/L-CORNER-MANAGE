import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const DEFAULT_THEME = {
  theme_color: "#213559",
  theme_color_light: "#2c4a7a",
  theme_color_dark: "#1a2844",
};

export type ThemeColors = typeof DEFAULT_THEME;

// Reads the caller's shop's AppSettings row (creating it with defaults on
// first access). Used by the root layout on every request, so it must never
// throw — falling back to the hardcoded defaults keeps the app rendering
// even if the DB is briefly unreachable. Pre-login (no session yet, e.g. the
// login page itself) there's no shop to scope to, so it just returns the
// hardcoded defaults rather than guessing a shop.
export async function getThemeColors(): Promise<ThemeColors> {
  try {
    const session = await auth();
    const shopId = session?.user?.shop_id;
    if (!shopId) return DEFAULT_THEME;

    const settings = await prisma.appSettings.upsert({
      where: { shop_id: shopId },
      update: {},
      create: { shop_id: shopId, ...DEFAULT_THEME },
    });
    return {
      theme_color: settings.theme_color,
      theme_color_light: settings.theme_color_light,
      theme_color_dark: settings.theme_color_dark,
    };
  } catch (error) {
    console.error("Error loading theme settings, using defaults:", error);
    return DEFAULT_THEME;
  }
}
