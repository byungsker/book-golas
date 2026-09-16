import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin-auth";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

type ServerCookieStore = Awaited<ReturnType<typeof cookies>>;

function isReadonlyCookieError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Cookies can only be modified|ReadonlyRequestCookies|Cookies are immutable/.test(
      error.message,
    )
  );
}

function createServerClientForCookieStore(cookieStore: ServerCookieStore) {
  const { url, anonKey } = getSupabasePublicConfig();

  return createServerClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          if (!isReadonlyCookieError(error)) throw error;
        }
      },
    },
  });
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClientForCookieStore(cookieStore);
}

export async function requireAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) return null;
  return user;
}
