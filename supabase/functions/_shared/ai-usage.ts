import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_MAX_INPUT_CHARS = 20_000;
export const AI_PROVIDER_TIMEOUT_MS = 15_000;

export class AiUsageError extends Error {
  constructor(
    readonly code: "input_too_large" | "quota_exceeded" | "budget_unavailable",
    readonly status: 413 | 429 | 503,
  ) {
    super(code);
    this.name = "AiUsageError";
  }
}

export function assertAiInputSize(inputChars: number): void {
  if (
    !Number.isFinite(inputChars) || inputChars < 0 ||
    inputChars > AI_MAX_INPUT_CHARS
  ) {
    throw new AiUsageError("input_too_large", 413);
  }
}

export async function consumeAiBudget(
  client: SupabaseClient,
  inputChars: number,
): Promise<void> {
  assertAiInputSize(inputChars);
  const { data, error } = await client.rpc("consume_ai_usage", {
    p_input_chars: Math.ceil(inputChars),
  });
  if (error) {
    throw new AiUsageError("budget_unavailable", 503);
  }
  if (!data?.allowed) {
    throw new AiUsageError(
      data?.reason === "input_too_large" ? "input_too_large" : "quota_exceeded",
      data?.reason === "input_too_large" ? 413 : 429,
    );
  }
}

export function aiUsageErrorResponse(
  error: unknown,
  headers: Record<string, string>,
): Response | null {
  if (!(error instanceof AiUsageError)) return null;
  return new Response(
    JSON.stringify({ error: error.code }),
    {
      status: error.status,
      headers: { "Content-Type": "application/json", ...headers },
    },
  );
}

export async function fetchAiProvider(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
