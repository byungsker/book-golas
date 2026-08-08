import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_MAX_INPUT_CHARS = 20_000;
export const AI_MAX_OUTPUT_TOKENS = 1_000;
export const AI_PROVIDER_TIMEOUT_MS = 15_000;

export class AiUsageError extends Error {
  constructor(
    readonly code:
      | "input_too_large"
      | "quota_exceeded"
      | "concurrency_exceeded"
      | "budget_unavailable",
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
): Promise<string> {
  assertAiInputSize(inputChars);
  const { data, error } = await client.rpc("consume_ai_usage", {
    p_input_chars: Math.ceil(inputChars),
  });
  if (error) {
    throw new AiUsageError("budget_unavailable", 503);
  }
  if (!data?.allowed) {
    throw new AiUsageError(
      data?.reason === "input_too_large"
        ? "input_too_large"
        : data?.reason === "concurrency_exceeded"
        ? "concurrency_exceeded"
        : "quota_exceeded",
      data?.reason === "input_too_large" ? 413 : 429,
    );
  }
  if (typeof data.leaseId !== "string") {
    throw new AiUsageError("budget_unavailable", 503);
  }
  return data.leaseId;
}

export async function releaseAiBudget(
  client: SupabaseClient,
  leaseId: string,
): Promise<void> {
  const { error } = await client.rpc("release_ai_usage", {
    p_lease_id: leaseId,
  });
  if (error) {
    throw new AiUsageError("budget_unavailable", 503);
  }
}

export async function acquireAiBudget(
  client: SupabaseClient,
  inputChars: number,
): Promise<() => Promise<void>> {
  const leaseId = await consumeAiBudget(client, inputChars);
  return () => releaseAiBudget(client, leaseId);
}

export async function withAiBudget<T>(
  client: SupabaseClient,
  inputChars: number,
  operation: () => Promise<T>,
): Promise<T> {
  const leaseId = await consumeAiBudget(client, inputChars);
  try {
    return await operation();
  } finally {
    await releaseAiBudget(client, leaseId);
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
