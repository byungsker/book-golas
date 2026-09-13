import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  SupabaseConfigurationError,
  type SupabaseEnvironment,
  type SupabasePublicConfig,
} from "@/lib/supabase-config";

export type SupabaseAdminConfig = SupabasePublicConfig &
  Readonly<{
    serviceRoleKey: string;
  }>;

function getServiceRoleKey(environment: SupabaseEnvironment): string {
  const value = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (
    !value ||
    value === "placeholder-key" ||
    value === "REQUIRED_LOCAL_SERVICE_ROLE_KEY"
  ) {
    throw new SupabaseConfigurationError("SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}

function runtimeAdminEnvironment(): SupabaseEnvironment {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getSupabaseAdminConfig(
  environment: SupabaseEnvironment = runtimeAdminEnvironment(),
): SupabaseAdminConfig {
  return {
    ...getSupabasePublicConfig(environment),
    serviceRoleKey: getServiceRoleKey(environment),
  };
}

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
