export const consumerLocales = ["ko", "en"] as const;

export type ConsumerLocale = (typeof consumerLocales)[number];

export function isConsumerLocale(value: string): value is ConsumerLocale {
  return consumerLocales.includes(value as ConsumerLocale);
}

export function getConsumerPath(
  locale: ConsumerLocale | string,
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function getSafeNextPath(
  locale: ConsumerLocale | string,
  candidate: string | undefined,
): string {
  const fallback = getConsumerPath(locale, "/home");

  if (!candidate || candidate.startsWith("//")) return fallback;
  if (!candidate.startsWith(`/${locale}/`)) return fallback;

  return candidate;
}
