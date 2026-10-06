import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/shared/auth/admin-email";
import { getSupabasePublicConfig } from "@/shared/api/supabase/config";

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
  const sessionClient = createSessionClient(request);
  let user = null;

  try {
    const { data } = await sessionClient.supabase.auth.getClaims();
    if (data?.claims) {
      user = (await sessionClient.supabase.auth.getUser()).data.user;
    }
  } catch {
    user = null;
  }

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthorizedAdmin = Boolean(user && isAdminEmail(user.email));

  if (!isLoginPage && !isAuthorizedAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (user) url.searchParams.set("error", "unauthorized");
    return finishAuthenticatedResponse(
      sessionClient.getResponse(),
      NextResponse.redirect(url),
    );
  }

  if (isLoginPage && isAuthorizedAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return finishAuthenticatedResponse(
      sessionClient.getResponse(),
      NextResponse.redirect(url),
    );
  }

  return finishAuthenticatedResponse(
    sessionClient.getResponse(),
    NextResponse.next({ request }),
  );
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
};
