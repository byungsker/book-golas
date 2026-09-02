import "server-only";

import { createClient } from "@supabase/supabase-js";

export type AdminUser = { id: string };

export async function requireAdminUser(): Promise<AdminUser | null> {
  return null;
}

export function createServiceRoleSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase service role configuration is missing");

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
