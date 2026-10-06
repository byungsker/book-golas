import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/shared/config/i18n";
import {
  getConsumerSignInRedirectPath,
  isConsumerRoutePath,
  isProtectedConsumerRoutePath,
  isUnprefixedConsumerRoutePath,
} from "@/shared/routing";
import { getConsumerRouteFixture } from "@/shared/config";
import { getSupabasePublicConfig } from "@/shared/api/supabase/config";

const intlMiddleware = createIntlMiddleware(routing);
const consumerIntlMiddleware = createIntlMiddleware({
  ...routing,
  localePrefix: "always",
});

function createSessionClient(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return {
    supabase,
    getResponse: () => response,
  };
}

function copySessionCookies(source: NextResponse, destination: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }
  return destination;
}

function finishAuthenticatedResponse(sessionResponse: NextResponse, response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return copySessionCookies(sessionResponse, response);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isConsumerRoute =
    isConsumerRoutePath(pathname) || isUnprefixedConsumerRoutePath(pathname);
  const sessionClient = isConsumerRoute ? createSessionClient(request) : null;
  const routeFixture = getConsumerRouteFixture(
    request.cookies.get("bookgolas-route-fixture")?.value,
  );
  let hasVerifiedClaims = false;

  if (
    ([
      "authenticated-not-found",
      "bootstrap-network",
      "deleted-book",
      "home-book-list",
      "home-empty-completed",
      "home-empty-paused",
      "home-empty-planned",
      "home-empty-reading",
      "unauthorized-private-data",
      "pending",
      "unavailable",
    ].includes(routeFixture ?? "") ||
      routeFixture?.startsWith("library-") ||
      routeFixture?.startsWith("book-discovery-") ||
      routeFixture?.startsWith("book-lifecycle-") ||
      routeFixture?.startsWith("book-detail-") ||
      routeFixture?.startsWith("progress-") ||
      routeFixture?.startsWith("timer-") ||
      routeFixture?.startsWith("notes-highlights-") ||
      routeFixture?.startsWith("images-ocr-") ||
      routeFixture?.startsWith("review-share-") ||
      routeFixture?.startsWith("calendar-") ||
      routeFixture?.startsWith("charts-goals-") ||
      routeFixture?.startsWith("ai-artifacts-") ||
      routeFixture?.startsWith("ai-consent-") ||
      routeFixture?.startsWith("account-settings-") ||
      routeFixture?.startsWith("account-deletion-") ||
      routeFixture?.startsWith("announcements-") ||
      routeFixture?.startsWith("web-push-") ||
      routeFixture?.startsWith("export-") ||
      routeFixture?.startsWith("recall-")) &&
    isConsumerRoute
  ) {
    hasVerifiedClaims = true;
  } else if (
    ["anonymous", "expired-session", "invalid-session"].includes(routeFixture ?? "") &&
    isConsumerRoute
  ) {
    hasVerifiedClaims = false;
  } else if (sessionClient) {
    try {
      const { data } = await sessionClient.supabase.auth.getClaims();
      hasVerifiedClaims = Boolean(data?.claims);
    } catch {
      hasVerifiedClaims = false;
    }
  }

  if (isUnprefixedConsumerRoutePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname}`;
    return finishAuthenticatedResponse(
      sessionClient?.getResponse() ?? NextResponse.next({ request }),
      NextResponse.redirect(url),
    );
  }

  if (isConsumerRoutePath(pathname)) {
    if (isProtectedConsumerRoutePath(pathname) && !hasVerifiedClaims) {
      const locale = pathname.split("/")[1];
      const url = request.nextUrl.clone();
      const returnTo = `${pathname}${request.nextUrl.search}`;
      const signInRedirect = getConsumerSignInRedirectPath(locale, returnTo);
      const safeSignInUrl = new URL(signInRedirect, request.url);
      url.pathname = safeSignInUrl.pathname;
      url.search = safeSignInUrl.search;
      return finishAuthenticatedResponse(
        sessionClient?.getResponse() ?? NextResponse.next({ request }),
        NextResponse.redirect(url),
      );
    }

    return finishAuthenticatedResponse(
      sessionClient?.getResponse() ?? NextResponse.next({ request }),
      consumerIntlMiddleware(request),
    );
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|privacy|terms|support|.*\\..*).*)", "/"],
};
