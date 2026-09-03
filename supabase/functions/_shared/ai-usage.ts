import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AiProvider,
  DEFAULT_AI_COST_POLICY,
  preflightAiCall,
} from "./ai-cost-control.ts";
import {
  type AiUsageContext,
  type AiUsageControlEventClient,
  type AiUsageLogClient,
  buildAiUsageControlEventRow,
  buildAiUsageLogRow,
  normalizeAiErrorCode,
  recordAiUsageControlEvent,
  recordAiUsageLog,
} from "./ai-usage-contract.ts";

export const AI_MAX_INPUT_CHARS = 20_000;
export const AI_MAX_OUTPUT_TOKENS = 1_000;
export const AI_PROVIDER_TIMEOUT_MS = 15_000;

export class AiUsageError extends Error {
  constructor(
    readonly code:
      | "input_too_large"
      | "quota_exceeded"
      | "rate_limit_exceeded"
      | "concurrency_exceeded"
      | "budget_exceeded"
      | "hard_cap_exceeded"
      | "pricing_unavailable"
      | "invalid_cost"
      | "budget_unavailable"
      | "usage_log_unavailable"
      | "invalid_token_usage"
      | "provider_error"
      | "provider_timeout",
    readonly status: 413 | 429 | 503,
  ) {
    super(code);
    this.name = "AiUsageError";
  }
}

export interface AiBudgetContext {
  functionName: string;
  feature?: string;
  provider?: AiProvider;
  model?: string;
  promptVersion?: string;
  requestId?: string | null;
  callId?: string | null;
  maxOutputTokens?: number;
  requireOutputTokens?: boolean;
}

export interface AiCallContext {
  functionName: string;
  feature: string;
  provider: AiProvider;
  model: string;
  promptVersion: string;
  requestId: string | null;
  callId: string;
  maxOutputTokens: number;
  requireOutputTokens: boolean;
}

export interface AiProviderResult<T> {
  value: T;
  usage?: unknown;
}

export type AiProviderOperation<T> = () => Promise<AiProviderResult<T>>;

const DEFAULT_CONTEXT: AiCallContext = {
  functionName: "unknown",
  feature: "unknown",
  provider: "open_ai",
  model: "gpt-4o-mini",
  promptVersion: "unknown-v1",
  requestId: null,
  callId: "",
  maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
  requireOutputTokens: true,
};

function resolveContext(
  context: AiBudgetContext = DEFAULT_CONTEXT,
): AiCallContext {
  return {
    functionName: context.functionName || DEFAULT_CONTEXT.functionName,
    feature: context.feature || context.functionName || DEFAULT_CONTEXT.feature,
    provider: context.provider ?? DEFAULT_CONTEXT.provider,
    model: context.model || DEFAULT_CONTEXT.model,
    promptVersion: context.promptVersion || DEFAULT_CONTEXT.promptVersion,
    requestId: context.requestId ?? DEFAULT_CONTEXT.requestId,
    callId: context.callId || crypto.randomUUID(),
    maxOutputTokens: context.maxOutputTokens ?? DEFAULT_CONTEXT.maxOutputTokens,
    requireOutputTokens: context.requireOutputTokens ??
      DEFAULT_CONTEXT.requireOutputTokens,
  };
}

export function assertAiInputSize(inputChars: number): void {
  if (
    !Number.isFinite(inputChars) || inputChars < 0 ||
    inputChars > AI_MAX_INPUT_CHARS
  ) {
    throw new AiUsageError("input_too_large", 413);
  }
}

function errorForReason(reason: unknown): AiUsageError {
  switch (reason) {
    case "input_too_large":
      return new AiUsageError("input_too_large", 413);
    case "rate_limit_exceeded":
      return new AiUsageError("rate_limit_exceeded", 429);
    case "quota_exceeded":
      return new AiUsageError("quota_exceeded", 429);
    case "concurrency_exceeded":
      return new AiUsageError("concurrency_exceeded", 429);
    case "budget_exceeded":
      return new AiUsageError("budget_exceeded", 429);
    case "hard_cap_exceeded":
      return new AiUsageError("hard_cap_exceeded", 429);
    case "pricing_unavailable":
      return new AiUsageError("pricing_unavailable", 503);
    case "cost_mismatch":
      return new AiUsageError("invalid_cost", 503);
    case "invalid_input":
      return new AiUsageError("invalid_token_usage", 503);
    default:
      return new AiUsageError("budget_unavailable", 503);
  }
}

export async function consumeAiBudget(
  client: SupabaseClient,
  inputChars: number,
  context: AiBudgetContext = DEFAULT_CONTEXT,
): Promise<string> {
  assertAiInputSize(inputChars);
  const resolved = resolveContext(context);
  const preflight = preflightAiCall({
    provider: resolved.provider,
    model: resolved.model,
    inputChars: Math.ceil(inputChars),
    maxOutputTokens: resolved.maxOutputTokens,
    policy: DEFAULT_AI_COST_POLICY,
  });
  if (!preflight.allowed || !preflight.estimate || preflight.pricing === null) {
    throw errorForReason(preflight.reason);
  }

  const { data, error } = await client.rpc("reserve_ai_usage", {
    p_feature: resolved.feature,
    p_provider: resolved.provider,
    p_model: resolved.model,
    p_prompt_version: resolved.promptVersion,
    p_request_id: resolved.requestId,
    p_call_id: resolved.callId,
    p_input_chars: Math.ceil(inputChars),
    p_estimated_input_tokens: preflight.estimate.inputTokens,
    p_estimated_output_tokens: preflight.estimate.outputTokens,
    p_estimated_cost_usd: preflight.estimatedCostUsd,
  });
  if (error) throw new AiUsageError("budget_unavailable", 503);
  if (!data?.allowed) throw errorForReason(data?.reason);
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
  if (error) throw new AiUsageError("budget_unavailable", 503);
}

export async function acquireAiBudget(
  client: SupabaseClient,
  inputChars: number,
  context: AiBudgetContext = DEFAULT_CONTEXT,
): Promise<() => Promise<void>> {
  const leaseId = await consumeAiBudget(client, inputChars, context);
  return () => releaseAiBudget(client, leaseId);
}

export async function withAiBudget<T>(
  client: SupabaseClient,
  inputChars: number,
  operation: () => Promise<T>,
  context: AiBudgetContext = DEFAULT_CONTEXT,
): Promise<T> {
  const release = await acquireAiBudget(client, inputChars, context);
  try {
    return await operation();
  } finally {
    await release();
  }
}

async function recordTrackedUsage(
  client: AiUsageLogClient,
  userId: string,
  context: AiCallContext,
  usage: unknown,
  latencyMs: number,
  status: "success" | "failure",
  error?: unknown,
): Promise<void> {
  const row = buildAiUsageLogRow({
    context: {
      userId,
      requestId: context.requestId,
      callId: context.callId,
      functionName: context.functionName,
      feature: context.feature,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
    } satisfies AiUsageContext,
    usage,
    latencyMs,
    status,
    requireOutputTokens: context.requireOutputTokens,
    error,
  });
  try {
    await recordAiUsageLog(client, row);
  } catch {
    throw new AiUsageError("usage_log_unavailable", 503);
  }
}

async function recordTrackedControlEvent(
  client: AiUsageLogClient,
  userId: string,
  context: AiCallContext,
  usage: unknown,
  eventType: "provider_error" | "usage_rejected",
  reason: string,
): Promise<void> {
  const row = buildAiUsageControlEventRow({
    context: {
      userId,
      requestId: context.requestId,
      callId: context.callId,
      functionName: context.functionName,
      feature: context.feature,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
    } satisfies AiUsageContext,
    usage,
    eventType,
    reason,
  });
  try {
    await recordAiUsageControlEvent(
      client as unknown as AiUsageControlEventClient,
      row,
    );
  } catch {
    throw new AiUsageError("usage_log_unavailable", 503);
  }
}

export async function withTrackedAiBudget<T>(
  budgetClient: SupabaseClient,
  logClient: AiUsageLogClient,
  userId: string,
  inputChars: number,
  context: AiBudgetContext,
  operation: AiProviderOperation<T>,
): Promise<T> {
  const resolved = resolveContext(context);
  const release = await acquireAiBudget(budgetClient, inputChars, resolved);
  const startedAt = performance.now();
  try {
    let providerResult: AiProviderResult<T>;
    try {
      providerResult = await operation();
    } catch (error) {
      await recordTrackedUsage(
        logClient,
        userId,
        resolved,
        undefined,
        performance.now() - startedAt,
        "failure",
        error,
      );
      await recordTrackedControlEvent(
        logClient,
        userId,
        resolved,
        undefined,
        "provider_error",
        normalizeAiErrorCode(error),
      );
      if (error instanceof AiUsageError) throw error;
      if (normalizeAiProviderTimeout(error)) {
        throw new AiUsageError("provider_timeout", 503);
      }
      throw new AiUsageError("provider_error", 503);
    }

    const row = buildAiUsageLogRow({
      context: {
        userId,
        requestId: resolved.requestId,
        callId: resolved.callId,
        functionName: resolved.functionName,
        feature: resolved.feature,
        provider: resolved.provider,
        model: resolved.model,
        promptVersion: resolved.promptVersion,
      },
      usage: providerResult.usage,
      latencyMs: performance.now() - startedAt,
      status: "success",
      requireOutputTokens: resolved.requireOutputTokens,
    });
    if (row.token_status !== "valid" || row.pricing_status !== "finalized") {
      await recordTrackedUsage(
        logClient,
        userId,
        resolved,
        providerResult.usage,
        performance.now() - startedAt,
        "failure",
        { code: "invalid_token_usage" },
      );
      await recordTrackedControlEvent(
        logClient,
        userId,
        resolved,
        providerResult.usage,
        "usage_rejected",
        "invalid_token_usage",
      );
      throw new AiUsageError("invalid_token_usage", 503);
    }
    try {
      await recordAiUsageLog(logClient, row);
    } catch {
      throw new AiUsageError("usage_log_unavailable", 503);
    }
    return providerResult.value;
  } finally {
    await release();
  }
}

export function createAiProviderRunner(
  budgetClient: SupabaseClient,
  logClient: AiUsageLogClient,
  userId: string,
  requestId: string | null = null,
): <T>(
  input: string,
  context: AiBudgetContext,
  operation: AiProviderOperation<T>,
) => Promise<T> {
  return <T>(
    input: string,
    context: AiBudgetContext,
    operation: AiProviderOperation<T>,
  ) =>
    withTrackedAiBudget(
      budgetClient,
      logClient,
      userId,
      input.length,
      { ...context, requestId },
      operation,
    );
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
