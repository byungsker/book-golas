export type SupabaseEnvironment = Readonly<{
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}>;

export type SupabasePublicConfig = Readonly<{
  url: string;
  anonKey: string;
}>;

export class SupabaseConfigurationError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`Missing or invalid Supabase environment variable: ${variable}`);
    this.name = "SupabaseConfigurationError";
    this.variable = variable;
  }
}

const PLACEHOLDER_VALUES = new Set([
  "placeholder-key",
  "REQUIRED_LOCAL_ANON_KEY",
  "https://placeholder.supabase.co",
]);

function runtimeEnvironment(): SupabaseEnvironment {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

function requiredEnvironmentValue(
  environment: SupabaseEnvironment,
  variable: keyof SupabaseEnvironment,
): string {
  const value = environment[variable]?.trim();
  if (!value || PLACEHOLDER_VALUES.has(value)) {
    throw new SupabaseConfigurationError(variable);
  }
  return value;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function getSupabasePublicConfig(
  environment: SupabaseEnvironment = runtimeEnvironment(),
): SupabasePublicConfig {
  const url = requiredEnvironmentValue(environment, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnvironmentValue(environment, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.hostname === "placeholder.supabase.co" ||
      (parsedUrl.protocol === "http:" && !isLoopbackHostname(parsedUrl.hostname)) ||
      (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
    ) {
      throw new SupabaseConfigurationError("NEXT_PUBLIC_SUPABASE_URL");
    }
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) throw error;
    throw new SupabaseConfigurationError("NEXT_PUBLIC_SUPABASE_URL");
  }

  return { url, anonKey };
}
