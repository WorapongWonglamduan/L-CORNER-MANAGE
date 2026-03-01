import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !["th", "en"].includes(locale)) {
    locale = "th";
  }

  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
