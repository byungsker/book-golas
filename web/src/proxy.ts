import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isAiMonitorDemoRequest } from "./lib/ai-monitor-access";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    const isLoginPage = request.nextUrl.pathname === "/admin/login";
    const isLocalMonitor = (request.nextUrl.pathname === "/admin/ai-monitor" || request.nextUrl.pathname.startsWith("/admin/ai-monitor/"))
      && isAiMonitorDemoRequest(request.headers.get("host"));
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
