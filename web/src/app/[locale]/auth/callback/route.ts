import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConsumerPath, isConsumerLocale } from "@/lib/consumer/paths";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

function getSafeNextPath(request: NextRequest, locale: string, value: string | null): string {
  const fallback = getConsumerPath(locale, "/home");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const candidate = new URL(value, request.url);
    if (candidate.origin !== request.nextUrl.origin) return fallback;
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return fallback;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await context.params;
  const locale = isConsumerLocale(rawLocale) ? rawLocale : "ko";
  const nextPath = getSafeNextPath(request, locale, request.nextUrl.searchParams.get("next"));
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
