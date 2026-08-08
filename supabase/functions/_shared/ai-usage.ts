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
      | "budget_unavailable"
      | "provider_timeout",
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
  const normalizedError = normalizeAiProviderTimeout(error);
  if (normalizedError) error = normalizedError;
  if (!(error instanceof AiUsageError)) return null;
  return new Response(
    JSON.stringify({ error: error.code }),
    {
      status: error.status,
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}

export function normalizeAiProviderTimeout(
  error: unknown,
): AiUsageError | null {
  if (error instanceof AiUsageError) {
    return error.code === "provider_timeout" ? error : null;
  }
  if (!(error instanceof Error)) return null;
  if (
    error.name === "AbortError" || error.name === "TimeoutError" ||
    /timed?\s*out|timeout/i.test(error.message)
  ) {
    return new AiUsageError("provider_timeout", 503);
  }
  return null;
}

export async function fetchAiProvider(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = AI_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = init.signal
      ? AbortSignal.any([controller.signal, init.signal])
      : controller.signal;
    const response = await fetch(input, { ...init, signal });
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiUsageError("provider_timeout", 503);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
