import type { AppLocale } from "@/shared/config";

export function getConsumerPath(
  locale: AppLocale | string,
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}
