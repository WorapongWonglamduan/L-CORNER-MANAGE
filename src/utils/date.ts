/**
 * Format date string to localized date time format
 * @param dateString - ISO date string
 * @param locale - Locale code (e.g., 'th', 'en')
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, locale: string = "th"): string => {
  const date = new Date(dateString);
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  
  return new Intl.DateTimeFormat(localeCode, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Format date string to short date format (without time)
 * @param dateString - ISO date string
 * @param locale - Locale code (e.g., 'th', 'en')
 * @returns Formatted date string
 */
export const formatDateShort = (dateString: string, locale: string = "th"): string => {
  const date = new Date(dateString);
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  
  return new Intl.DateTimeFormat(localeCode, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

/**
 * Format date string to time only format
 * @param dateString - ISO date string
 * @param locale - Locale code (e.g., 'th', 'en')
 * @returns Formatted time string
 */
export const formatTime = (dateString: string, locale: string = "th"): string => {
  const date = new Date(dateString);
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  
  return new Intl.DateTimeFormat(localeCode, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
