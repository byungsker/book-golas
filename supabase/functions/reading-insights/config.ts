export const config = {
  openai: {
    apiKey: Deno.env.get("OPENAI_API_KEY") || "",
    model: "gpt-4o-mini",
    temperature: 0.7,
  },
  supabase: {
    url: Deno.env.get("SUPABASE_URL") || "",
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  },
  insights: {
    maxBooksToAnalyze: 10,
    minHighlightsForInsight: 3,
    rateLimitHours: 24,
    memoryLimit: 5,
    timeoutSeconds: 30,
  },
};

export function validateConfig(): void {
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  if (
    !config.supabase.url ||
    !config.supabase.anonKey ||
    !config.supabase.serviceRoleKey
  ) {
    throw new Error("Supabase credentials not configured");
  }
}
