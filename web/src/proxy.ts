import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isAdminEmail } from "./lib/admin-auth";
import {
  isConsumerRoutePath,
  isProtectedConsumerRoutePath,
  isUnprefixedConsumerRoutePath,
} from "./lib/consumer/paths";
import { getConsumerRouteFixture } from "./lib/consumer/route-fixture";
import { getSupabasePublicConfig } from "./lib/supabase-config";

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

function copySessionCookies(source: NextResponse, destination: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }
  return destination;
}

function finishAuthenticatedResponse(
  sessionResponse: NextResponse,
  response: NextResponse,
): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return copySessionCookies(sessionResponse, response);
}

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isConsumerRoute =
    isConsumerRoutePath(request.nextUrl.pathname) ||
    isUnprefixedConsumerRoutePath(request.nextUrl.pathname);
  const sessionClient = isAdminRoute || isConsumerRoute ? createSessionClient(request) : null;
  let hasVerifiedClaims = false;
  const routeFixture = getConsumerRouteFixture(
    request.cookies.get("bookgolas-route-fixture")?.value,
  );

  if (
    ["authenticated-not-found", "unauthorized-private-data", "pending", "unavailable"].includes(routeFixture ?? "") &&
    isConsumerRoute
  ) {
    hasVerifiedClaims = true;
  } else if (["anonymous", "expired-session"].includes(routeFixture ?? "") && isConsumerRoute) {
    hasVerifiedClaims = false;
  } else if (sessionClient) {
    try {
      const { data } = await sessionClient.supabase.auth.getClaims();
      hasVerifiedClaims = Boolean(data?.claims);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
  }

  if (isAdminRoute) {
    const user =
      sessionClient && hasVerifiedClaims
        ? (await sessionClient.supabase.auth.getUser()).data.user
        : null;

    const isLoginPage = request.nextUrl.pathname === "/admin/login";

    if (!isLoginPage) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return finishAuthenticatedResponse(
          sessionClient?.getResponse() ?? NextResponse.next({ request }),
          NextResponse.redirect(url),
        );
      }

      if (!isAdminEmail(user.email)) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("error", "unauthorized");
        return finishAuthenticatedResponse(
          sessionClient?.getResponse() ?? NextResponse.next({ request }),
          NextResponse.redirect(url),
        );
      }
    }

    if (isLoginPage && user && isAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return finishAuthenticatedResponse(
        sessionClient?.getResponse() ?? NextResponse.next({ request }),
        NextResponse.redirect(url),
      );
    }

    return finishAuthenticatedResponse(
      sessionClient?.getResponse() ?? NextResponse.next({ request }),
      NextResponse.next({ request }),
    );
  }

  if (isUnprefixedConsumerRoutePath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${request.nextUrl.pathname}`;
    return finishAuthenticatedResponse(
      sessionClient?.getResponse() ?? NextResponse.next({ request }),
      NextResponse.redirect(url),
    );
  }

  if (isConsumerRoutePath(request.nextUrl.pathname)) {
    if (isProtectedConsumerRoutePath(request.nextUrl.pathname) && !hasVerifiedClaims) {
      const locale = request.nextUrl.pathname.split("/")[1];
      const url = request.nextUrl.clone();
      const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      url.pathname = `/${locale}/auth/sign-in`;
      url.search = "";
      url.searchParams.set("returnTo", returnTo);
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
