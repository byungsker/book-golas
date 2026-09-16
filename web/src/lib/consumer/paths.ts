export const consumerLocales = ["ko", "en"] as const;

export type ConsumerLocale = (typeof consumerLocales)[number];

const consumerRoutePattern = /^\/(?:auth\/(?:sign-in|sign-up|reset-password|callback)|announcements|onboarding|home|library|stats|reading-insights|calendar|account(?:\/notifications)?|account-deleted|book-list|books\/(?:new|scan|[0-9a-f-]{36}(?:\/(?:review|mind-map))?)|reading\/[0-9a-f-]{36}|subscription)(?:[/?#]|$)/i;
const protectedConsumerRoutePattern = /^\/(?:announcements|onboarding|home|library|stats|reading-insights|calendar|account(?:\/notifications)?|book-list|books\/(?:new|scan|[0-9a-f-]{36}(?:\/(?:review|mind-map))?)|reading\/[0-9a-f-]{36}|subscription)(?:[/?#]|$)/i;

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

/**
 * Build the only consumer auth handoff used for a private route.
 *
 * The destination is normalized before it is serialized so a stale session
 * can never turn the sign-in page into an open redirect or a cross-locale
 * handoff.
 */
export function getConsumerSignInRedirectPath(
  locale: ConsumerLocale | string,
  candidate: string | undefined,
): string {
  const signInPath = getConsumerPath(locale, "/auth/sign-in");
  const safeTarget = getSafeNextPath(locale, candidate);
  return `${signInPath}?returnTo=${encodeURIComponent(safeTarget)}`;
}

export function isConsumerRoutePath(pathname: string): boolean {
  const match = pathname.match(/^\/(ko|en)(\/.*)$/i);
  return Boolean(match && consumerRoutePattern.test(match[2]));
}

export function isProtectedConsumerRoutePath(pathname: string): boolean {
  const match = pathname.match(/^\/(ko|en)(\/.*)$/i);
  return Boolean(match && protectedConsumerRoutePattern.test(match[2]));
}

export function isUnprefixedConsumerRoutePath(pathname: string): boolean {
  return consumerRoutePattern.test(pathname);
}

function hasUnsafePathSegments(value: string): boolean {
  if (value.includes("\\")) return true;

  try {
    let currentPath = value.split(/[?#]/, 1)[0];
    let currentCandidate = value;

    for (let depth = 0; depth < 8; depth += 1) {
      const decodedPath = decodeURIComponent(currentPath);
      const decodedCandidate = decodeURIComponent(currentCandidate);

      const pathHasUnsafeContent = decodedPath.includes("\\");
      const candidateHasUnsafeContent = decodedCandidate.includes("\\");
      const pathHasUnsafeSegments = decodedPath
        .split("/")
        .slice(2)
        .some((segment) => segment.length === 0 || segment === "." || segment === "..");
      const candidateHasTraversalSegments = decodedCandidate
        .split("/")
        .slice(2)
        .some((segment) => segment === "." || segment === "..");

      if (pathHasUnsafeContent || candidateHasUnsafeContent || pathHasUnsafeSegments || candidateHasTraversalSegments) return true;
      if (decodedPath === currentPath && decodedCandidate === currentCandidate) return false;
      currentPath = decodedPath;
      currentCandidate = decodedCandidate;
    }

    return true;
  } catch {
    return true;
  }
}

export function getSafeNextPath(
  locale: ConsumerLocale | string,
  candidate: string | undefined,
): string {
  const fallback = getConsumerPath(locale, "/home");

  if (!candidate || candidate.startsWith("//") || hasUnsafePathSegments(candidate)) return fallback;
  if (!candidate.startsWith(`/${locale}/`)) return fallback;
  if (!isProtectedConsumerRoutePath(candidate)) return fallback;

  return candidate;
}
