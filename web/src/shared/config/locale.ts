export const appLocales = ["ko", "en"] as const;

export type AppLocale = (typeof appLocales)[number];

export function isAppLocale(value: string): value is AppLocale {
  return appLocales.includes(value as AppLocale);
}
