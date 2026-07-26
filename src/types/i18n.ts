export type Locale = "th" | "en";

/** Shape of every `*_i18n` JSON column in the Prisma schema (name_i18n, description_i18n, abbreviation_i18n, etc). */
export interface I18nText {
  th: string;
  en: string;
}
