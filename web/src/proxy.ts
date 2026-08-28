import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isAdminEmail } from "./lib/admin-auth";

const intlMiddleware = createIntlMiddleware(routing);
const consumerRoutePattern = /^\/(ko|en)\/(auth|home|books|reading)(?:\/|$)/;
const unprefixedConsumerRoutePattern = /^\/(auth|home|books|reading)(?:\/|$)/;

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = request.nextUrl.pathname === "/admin/login";

    if (!isLoginPage) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }

      if (!isAdminEmail(user.email)) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(url);
      }
    }

    if (isLoginPage && user && isAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (unprefixedConsumerRoutePattern.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${request.nextUrl.pathname}`;
    return NextResponse.redirect(url);
  }

  if (consumerRoutePattern.test(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|privacy|terms|support|.*\\..*).*)", "/"],
};
