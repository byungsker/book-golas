import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicConfig();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    persistSession: true,
  },
});
