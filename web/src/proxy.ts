import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    const isLoginPage = request.nextUrl.pathname === "/admin/login";
    const normalizedHost = request.headers.get("host")?.trim().toLowerCase() ?? "";
    const hostname = normalizedHost.startsWith("[")
      ? normalizedHost.slice(1, normalizedHost.indexOf("]"))
      : normalizedHost.split(":")[0];
    const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const isLocalMonitor = request.nextUrl.pathname === "/admin/ai-monitor"
      && process.env.NODE_ENV === "development"
      && process.env.AI_MONITOR_LOCAL_DEMO === "true"
      && isLoopback;
    if (isLocalMonitor) return NextResponse.next({ request });

    if (!isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "admin_disabled");
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|privacy|terms|support|.*\\..*).*)", "/"],
};
