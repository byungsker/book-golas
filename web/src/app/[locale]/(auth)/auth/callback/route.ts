import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConsumerPath, getSafeNextPath, isConsumerLocale } from "@/lib/consumer/paths";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await context.params;
  const locale = isConsumerLocale(rawLocale) ? rawLocale : "ko";
  const nextPath = getSafeNextPath(
    locale,
    request.nextUrl.searchParams.get("returnTo") ??
      request.nextUrl.searchParams.get("next") ??
      undefined,
  );
  const response = NextResponse.redirect(
    new URL(nextPath, request.url),
  );
  response.headers.set("Cache-Control", "private, no-store");

  const { url, anonKey } = getSupabasePublicConfig();
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
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorUrl = new URL(getConsumerPath(locale, "/auth/sign-in"), request.url);
      errorUrl.searchParams.set("error", "auth_callback");
      errorUrl.searchParams.set("next", nextPath);
      const errorResponse = NextResponse.redirect(errorUrl);
      errorResponse.headers.set("Cache-Control", "private, no-store");
      for (const cookie of response.cookies.getAll()) {
        errorResponse.cookies.set(cookie);
      }
      return errorResponse;
    }
  }

  return response;
}
