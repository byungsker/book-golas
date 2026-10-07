export const AI_USAGE_EVENT_VERSION = 1;
export const AI_PRICING_VERSION = "pricing-v1";
export const AI_MAX_TOKEN_COUNT = 1_000_000;

export type AiProvider = "open_ai";
export type AiUsageStatus = "success" | "failure";
export type AiTokenStatus = "valid" | "missing" | "anomalous" | "inconsistent";
export type AiUsageErrorCode =
  | "invalid_contract_input"
  | "input_too_large"
  | "model_not_allowed"
  | "quota_exceeded"
  | "rate_limit_exceeded"
  | "concurrency_exceeded"
  | "budget_exceeded"
  | "hard_cap_exceeded"
  | "budget_unavailable"
  | "usage_log_unavailable"
  | "invalid_token_usage"
  | "provider_error"
  | "provider_timeout";

export class AiUsageError extends Error {
  readonly name = "AiUsageError";

  constructor(
    readonly code: AiUsageErrorCode,
    readonly status: 400 | 413 | 429 | 502 | 503 | 504,
    readonly requestId: string | null = null,
  ) {
    super(code);
  }
}

export type AiBudgetContext = {
  readonly functionName: string;
  readonly feature?: string;
  readonly provider?: AiProvider;
  readonly model?: string;
  readonly promptVersion?: string;
  readonly requestId?: string | null;
  readonly callId?: string | null;
  readonly maxOutputTokens?: number;
};

export interface AiBudgetClient {
  rpc(name: string, input: Readonly<Record<string, unknown>>): PromiseLike<{
    readonly data: unknown;
    readonly error: unknown;
  }>;
}

export type AiProviderResult<T> = {
  readonly value: T;
  readonly usage: unknown;
};

export type AiUsageContext = {
  readonly userId: string | null;
  readonly requestId: string | null;
  readonly callId: string | null;
  readonly functionName: string;
  readonly feature: string;
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptVersion: string;
};

export type AiUsageLogRow = {
  readonly event_version: typeof AI_USAGE_EVENT_VERSION;
  readonly user_id: string | null;
  readonly request_id: string | null;
  readonly call_id: string | null;
  readonly function_name: string;
  readonly feature: string;
  readonly provider: AiProvider;
  readonly model: string;
  readonly prompt_version: string;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly total_tokens: number | null;
  readonly estimated_cost_microusd: number | null;
  readonly pricing_version: typeof AI_PRICING_VERSION;
  readonly token_status: AiTokenStatus;
  readonly latency_ms: number;
  readonly status: AiUsageStatus;
  readonly error_code: string | null;
};

export interface AiUsageLogClient {
  from(table: string): {
    insert(row: AiUsageLogRow): PromiseLike<{ readonly error: unknown | null }>;
  };
}

type NormalizedUsage = {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
  readonly tokenStatus: AiTokenStatus;
};

const MODEL_PRICES_MICROUSD_PER_MILLION = {
  "gpt-4o-mini": { input: 150_000, output: 600_000 },
  "text-embedding-3-small": { input: 20_000, output: 0 },
} as const;

export type ApprovedAiModel = keyof typeof MODEL_PRICES_MICROUSD_PER_MILLION;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= AI_MAX_TOKEN_COUNT
    ? value
    : null;
}

export function isApprovedAiModel(model: string): model is ApprovedAiModel {
  return Object.hasOwn(MODEL_PRICES_MICROUSD_PER_MILLION, model);
}

export function normalizeAiUsage(value: unknown): NormalizedUsage {
  const usage = isRecord(value) && isRecord(value.usage) ? value.usage : value;
  if (!isRecord(usage)) {
    return { inputTokens: null, outputTokens: null, totalTokens: null, tokenStatus: "missing" };
  }
  const rawInput = usage.input_tokens ?? usage.prompt_tokens;
  const rawOutput = usage.output_tokens ?? usage.completion_tokens;
  const inputTokens = tokenCount(rawInput);
  const outputTokens = tokenCount(rawOutput);
  const reportedTotal = tokenCount(usage.total_tokens);
  if ((rawInput !== undefined && inputTokens === null) || (rawOutput !== undefined && outputTokens === null) || (usage.total_tokens !== undefined && reportedTotal === null)) {
    return { inputTokens, outputTokens, totalTokens: reportedTotal, tokenStatus: "anomalous" };
  }
  if (inputTokens === null || outputTokens === null) {
    return { inputTokens, outputTokens, totalTokens: reportedTotal, tokenStatus: "missing" };
  }
  const computedTotal = inputTokens + outputTokens;
  if (computedTotal > AI_MAX_TOKEN_COUNT || (reportedTotal !== null && reportedTotal !== computedTotal)) {
    return { inputTokens, outputTokens, totalTokens: reportedTotal, tokenStatus: "inconsistent" };
  }
  return { inputTokens, outputTokens, totalTokens: computedTotal, tokenStatus: "valid" };
}

export function calculateAiCostMicrousd(
  model: ApprovedAiModel,
  inputTokens: number,
  outputTokens: number,
): number | null {
  if (tokenCount(inputTokens) === null || tokenCount(outputTokens) === null) return null;
  const price = MODEL_PRICES_MICROUSD_PER_MILLION[model];
  const numerator = inputTokens * price.input + outputTokens * price.output;
  if (!Number.isSafeInteger(numerator)) return null;
  return Math.ceil(numerator / 1_000_000);
}

export function normalizeAiErrorCode(error: unknown): string {
  if (isRecord(error) && typeof error.code === "string" && /^[a-z0-9_:-]{1,80}$/.test(error.code)) return error.code;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || /timed?\s*out|timeout/i.test(error.message))) return "provider_timeout";
  return "provider_error";
}

export function buildAiUsageLogRow(params: {
  readonly context: AiUsageContext;
  readonly usage: unknown;
  readonly latencyMs: number;
  readonly status: AiUsageStatus;
  readonly error?: unknown;
}): AiUsageLogRow {
  const normalized = normalizeAiUsage(params.usage);
  const estimatedCostMicrousd = normalized.tokenStatus === "valid" && isApprovedAiModel(params.context.model)
    ? calculateAiCostMicrousd(params.context.model, normalized.inputTokens ?? 0, normalized.outputTokens ?? 0)
    : null;
  const latencyMs = Number.isFinite(params.latencyMs) && params.latencyMs >= 0
    ? Math.min(Math.round(params.latencyMs), 2_147_483_647)
    : 0;
  return {
    event_version: AI_USAGE_EVENT_VERSION,
    user_id: params.context.userId,
    request_id: params.context.requestId,
    call_id: params.context.callId,
    function_name: params.context.functionName,
    feature: params.context.feature,
    provider: params.context.provider,
    model: params.context.model,
    prompt_version: params.context.promptVersion,
    input_tokens: normalized.inputTokens,
    output_tokens: normalized.outputTokens,
    total_tokens: normalized.totalTokens,
    estimated_cost_microusd: estimatedCostMicrousd,
    pricing_version: AI_PRICING_VERSION,
    token_status: normalized.tokenStatus,
    latency_ms: latencyMs,
    status: params.status,
    error_code: params.error === undefined ? null : normalizeAiErrorCode(params.error),
  };
}

export async function recordAiUsageLog(client: AiUsageLogClient, row: AiUsageLogRow): Promise<void> {
  const { error } = await client.from("ai_usage_logs").insert(row);
  if (error !== null && error !== undefined) throw new Error("AI usage log insert failed", { cause: error });
}
