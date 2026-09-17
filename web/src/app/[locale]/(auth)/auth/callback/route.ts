import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConsumerPath, getSafeNextPath, isConsumerLocale } from "@/lib/consumer/paths";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

function callbackErrorResponse(
  request: NextRequest,
  locale: "ko" | "en",
  nextPath: string,
  error: "auth_callback" | "oauth_cancelled" | "oauth_provider",
  sessionResponse?: NextResponse,
) {
  const errorUrl = new URL(getConsumerPath(locale, "/auth/sign-in"), request.url);
  errorUrl.searchParams.set("error", error);
  errorUrl.searchParams.set("next", nextPath);
  const response = NextResponse.redirect(errorUrl);
  response.headers.set("Cache-Control", "private, no-store");
  for (const cookie of sessionResponse?.cookies.getAll() ?? []) response.cookies.set(cookie);
  return response;
}

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
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    return callbackErrorResponse(
      request,
      locale,
      nextPath,
      providerError === "access_denied" ? "oauth_cancelled" : "oauth_provider",
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return callbackErrorResponse(request, locale, nextPath, "auth_callback");
  }

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

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return callbackErrorResponse(request, locale, nextPath, "auth_callback", response);
    }
    return response;
  } catch {
    return callbackErrorResponse(request, locale, nextPath, "auth_callback", response);
  }
}
