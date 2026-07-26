// Curated preset theme colors — deliberately not a free-form color picker.
// Every preset is dark enough to keep white button/gradient text readable
// (this app's buttons and gradients assume white text on the primary color),
// so picking one never produces a low-contrast combination.
export interface ThemePreset {
  id: string;
  name_i18n: { th: string; en: string };
  theme_color: string;
  theme_color_light: string;
  theme_color_dark: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "navy",
    name_i18n: { th: "กรมท่า (ค่าเริ่มต้น)", en: "Navy (Default)" },
    theme_color: "#213559",
    theme_color_light: "#2c4a7a",
    theme_color_dark: "#1a2844",
  },
  {
    id: "forest",
    name_i18n: { th: "เขียวป่า", en: "Forest" },
    theme_color: "#1b4332",
    theme_color_light: "#2d6a4f",
    theme_color_dark: "#14322a",
  },
  {
    id: "wine",
    name_i18n: { th: "แดงไวน์", en: "Wine" },
    theme_color: "#6b1d2b",
    theme_color_light: "#8f2d3f",
    theme_color_dark: "#4a1420",
  },
  {
    id: "indigo",
    name_i18n: { th: "คราม", en: "Indigo" },
    theme_color: "#3730a3",
    theme_color_light: "#4f46e5",
    theme_color_dark: "#2b2380",
  },
  {
    id: "charcoal",
    name_i18n: { th: "เทาถ่าน", en: "Charcoal" },
    theme_color: "#1f2937",
    theme_color_light: "#374151",
    theme_color_dark: "#111827",
  },
  {
    id: "teal",
    name_i18n: { th: "เขียวเทอร์คอยส์", en: "Teal" },
    theme_color: "#0f766e",
    theme_color_light: "#14b8a6",
    theme_color_dark: "#0c5c56",
  },
  {
    id: "slate",
    name_i18n: { th: "เทาหินชนวน", en: "Slate" },
    theme_color: "#334155",
    theme_color_light: "#475569",
    theme_color_dark: "#1e293b",
  },
  {
    id: "amber",
    name_i18n: { th: "น้ำตาลอำพัน", en: "Amber" },
    theme_color: "#78350f",
    theme_color_light: "#92400e",
    theme_color_dark: "#451a03",
  },
];
