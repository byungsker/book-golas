import {
  AiUsageError,
  type AiBudgetClient,
  type AiBudgetContext,
  type AiProvider,
  type AiProviderResult,
  type AiUsageContext,
  type AiUsageErrorCode,
  type AiUsageLogClient,
  buildAiUsageLogRow,
  calculateAiCostMicrousd,
  isApprovedAiModel,
  normalizeAiErrorCode,
  recordAiUsageLog,
} from "./ai-usage-contract.ts";

export { AiUsageError };
export type { AiBudgetClient, AiBudgetContext, AiProviderResult, AiUsageErrorCode };

export const AI_MAX_INPUT_CHARS = 20_000;
export const AI_MAX_OUTPUT_TOKENS = 1_000;
export const AI_PROVIDER_TIMEOUT_MS = 15_000;

const DEFAULT_CONTEXT: AiBudgetContext = { functionName: "unknown" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlockedReason(value: unknown): value is AiUsageErrorCode {
  switch (value) {
    case "quota_exceeded":
    case "rate_limit_exceeded":
    case "concurrency_exceeded":
    case "budget_exceeded":
    case "hard_cap_exceeded":
      return true;
    default:
      return false;
  }
}

function resolvedContext(context: AiBudgetContext): Required<Omit<AiBudgetContext, "requestId" | "callId">> & {
  readonly requestId: string | null;
  readonly callId: string;
} {
  if (!context.functionName.trim()) throw new AiUsageError("invalid_contract_input", 400, context.requestId ?? null);
  return {
    functionName: context.functionName,
    feature: context.feature?.trim() || context.functionName,
    provider: context.provider ?? "open_ai",
    model: context.model?.trim() || "gpt-4o-mini",
    promptVersion: context.promptVersion?.trim() || "unknown-v1",
    requestId: context.requestId ?? null,
    callId: context.callId?.trim() || crypto.randomUUID(),
    maxOutputTokens: context.maxOutputTokens ?? AI_MAX_OUTPUT_TOKENS,
  };
}

export function assertAiInputSize(inputChars: number): void {
  if (!Number.isSafeInteger(inputChars) || inputChars < 0) throw new AiUsageError("invalid_contract_input", 400);
  if (inputChars > AI_MAX_INPUT_CHARS) throw new AiUsageError("input_too_large", 413);
}

function blockedError(reason: unknown, requestId: string | null): AiUsageError {
  if (isBlockedReason(reason)) return new AiUsageError(reason, 429, requestId);
  return new AiUsageError("budget_unavailable", 503, requestId);
}

export async function consumeAiBudget(
  client: AiBudgetClient,
  inputChars: number,
  context: AiBudgetContext = DEFAULT_CONTEXT,
): Promise<string> {
  assertAiInputSize(inputChars);
  const resolved = resolvedContext(context);
  if (resolved.provider !== "open_ai" || !isApprovedAiModel(resolved.model)) {
    throw new AiUsageError("model_not_allowed", 503, resolved.requestId);
  }
  if (!Number.isSafeInteger(resolved.maxOutputTokens) || resolved.maxOutputTokens < 0 || resolved.maxOutputTokens > AI_MAX_OUTPUT_TOKENS) {
    throw new AiUsageError("invalid_contract_input", 400, resolved.requestId);
  }
  const inputTokens = Math.ceil(inputChars / 4);
  const estimatedCostMicrousd = calculateAiCostMicrousd(resolved.model, inputTokens, resolved.maxOutputTokens);
  if (estimatedCostMicrousd === null) throw new AiUsageError("budget_unavailable", 503, resolved.requestId);
  const { data, error } = await client.rpc("reserve_ai_usage", {
    p_feature: resolved.feature,
    p_provider: resolved.provider,
    p_model: resolved.model,
    p_prompt_version: resolved.promptVersion,
    p_request_id: resolved.requestId,
    p_call_id: resolved.callId,
    p_input_chars: inputChars,
    p_estimated_input_tokens: inputTokens,
    p_estimated_output_tokens: resolved.maxOutputTokens,
    p_estimated_cost_microusd: estimatedCostMicrousd,
  });
  if (error !== null && error !== undefined || !isRecord(data)) throw new AiUsageError("budget_unavailable", 503, resolved.requestId);
  if (data.allowed !== true) throw blockedError(data.reason, resolved.requestId);
  if (typeof data.leaseId !== "string" || data.leaseId.length === 0) throw new AiUsageError("budget_unavailable", 503, resolved.requestId);
  return data.leaseId;
}

export async function releaseAiBudget(client: AiBudgetClient, leaseId: string): Promise<void> {
  if (!leaseId) throw new AiUsageError("invalid_contract_input", 400);
  const { data, error } = await client.rpc("release_ai_usage", { p_lease_id: leaseId });
  if (error !== null && error !== undefined || data !== true) throw new AiUsageError("budget_unavailable", 503);
}

export async function withAiBudget<T>(
  client: AiBudgetClient,
  inputChars: number,
  operation: () => Promise<T>,
  context: AiBudgetContext = DEFAULT_CONTEXT,
): Promise<T> {
  const leaseId = await consumeAiBudget(client, inputChars, context);
  try {
    return await operation();
  } finally {
    await releaseAiBudget(client, leaseId);
  }
}

export async function acquireAiBudget(
  client: AiBudgetClient,
  inputChars: number,
  context: AiBudgetContext = DEFAULT_CONTEXT,
): Promise<() => Promise<void>> {
  const leaseId = await consumeAiBudget(client, inputChars, context);
  return () => releaseAiBudget(client, leaseId);
}

export async function withTrackedAiBudget<T>(
  budgetClient: AiBudgetClient,
  logClient: AiUsageLogClient,
  userId: string,
  inputChars: number,
  context: AiBudgetContext,
  operation: () => Promise<AiProviderResult<T>>,
): Promise<T> {
  const resolved = resolvedContext(context);
  const leaseId = await consumeAiBudget(budgetClient, inputChars, resolved);
  const startedAt = performance.now();
  const usageContext: AiUsageContext = {
    userId,
    requestId: resolved.requestId,
    callId: resolved.callId,
    functionName: resolved.functionName,
    feature: resolved.feature,
    provider: resolved.provider,
    model: resolved.model,
    promptVersion: resolved.promptVersion,
  };
  try {
    let result: AiProviderResult<T>;
    try {
      result = await operation();
    } catch (error) {
      const code = normalizeAiErrorCode(error);
      try {
        await recordAiUsageLog(logClient, buildAiUsageLogRow({ context: usageContext, usage: null, latencyMs: performance.now() - startedAt, status: "failure", error }));
      } catch (loggingError) {
        if (loggingError instanceof Error) throw new AiUsageError("usage_log_unavailable", 503, resolved.requestId);
        throw new AiUsageError("usage_log_unavailable", 503, resolved.requestId);
      }
      const status = code === "provider_timeout" ? 504 : 502;
      throw new AiUsageError(code === "provider_timeout" ? "provider_timeout" : "provider_error", status, resolved.requestId);
    }
    const row = buildAiUsageLogRow({ context: usageContext, usage: result.usage, latencyMs: performance.now() - startedAt, status: "success" });
    if (row.token_status !== "valid" || row.estimated_cost_microusd === null) {
      try {
        await recordAiUsageLog(logClient, buildAiUsageLogRow({ context: usageContext, usage: result.usage, latencyMs: performance.now() - startedAt, status: "failure", error: { code: "invalid_token_usage" } }));
      } catch (loggingError) {
        if (loggingError instanceof Error) throw new AiUsageError("usage_log_unavailable", 503, resolved.requestId);
        throw new AiUsageError("usage_log_unavailable", 503, resolved.requestId);
      }
      throw new AiUsageError("invalid_token_usage", 503, resolved.requestId);
    }
    try {
      await recordAiUsageLog(logClient, row);
    } catch (error) {
      if (error instanceof Error) throw new AiUsageError("usage_log_unavailable", 503, resolved.requestId);
      throw new AiUsageError("usage_log_unavailable", 503, resolved.requestId);
    }
    return result.value;
  } finally {
    await releaseAiBudget(budgetClient, leaseId);
  }
}

export function aiUsageErrorResponse(error: unknown, headers: Readonly<Record<string, string>>): Response | null {
  const normalized = error instanceof AiUsageError ? error : normalizeAiProviderTimeout(error);
  if (!normalized) return null;
  return new Response(JSON.stringify({ error: normalized.code, audit: { code: normalized.code, status: normalized.status, requestId: normalized.requestId, retryable: normalized.status >= 500 || normalized.status === 429 } }), {
    status: normalized.status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function normalizeAiProviderTimeout(error: unknown): AiUsageError | null {
  if (error instanceof AiUsageError) return error.code === "provider_timeout" ? error : null;
  return normalizeAiErrorCode(error) === "provider_timeout"
    ? new AiUsageError("provider_timeout", 504)
    : null;
}

export function createAiProviderRunner(
  budgetClient: AiBudgetClient,
  logClient: AiUsageLogClient,
  userId: string,
  requestId: string | null = null,
): <T>(input: string, context: AiBudgetContext, operation: () => Promise<AiProviderResult<T>>) => Promise<T> {
  return <T>(input: string, context: AiBudgetContext, operation: () => Promise<AiProviderResult<T>>) =>
    withTrackedAiBudget(
      budgetClient,
      logClient,
      userId,
      input.length,
      { ...context, requestId, callId: context.callId ?? crypto.randomUUID() },
      operation,
    );
}

export async function fetchAiProvider(input: RequestInfo | URL, init: RequestInit, timeoutMs = AI_PROVIDER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = init.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal;
    return await fetch(input, { ...init, signal });
  } catch (error) {
    if (normalizeAiErrorCode(error) === "provider_timeout") throw new AiUsageError("provider_timeout", 504);
    throw new AiUsageError("provider_error", 502);
  } finally {
    clearTimeout(timeout);
  }
}
