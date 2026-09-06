import {
  AI_MAX_TOKEN_COUNT,
  AI_PRICING_REGISTRY_VERSION,
  type AiProvider,
  calculateAiCostUsd,
  resolveAiPricing,
} from "./ai-cost-control.ts";

import {
  AI_OBSERVABILITY_EVENT_VERSION,
  type AiOutcome,
  normalizeAiOutcome,
  sanitizeAiMetadata,
} from "./ai-observability.ts";

export type UsageStatus = "success" | "failure";
export type UsageSource = "provider" | "input_estimate" | "none";
export type TokenStatus = "valid" | "missing" | "anomalous" | "inconsistent";
export type PricingStatus = "finalized" | "not_finalized" | "unavailable";
export type ControlStatus = "allowed" | "blocked";

export interface NormalizedUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface UsageAssessment {
  usage: NormalizedUsage;
  tokenStatus: TokenStatus;
  pricingStatus: PricingStatus;
  estimatedCostUsd: number | null;
}

export interface AiUsageContext {
  userId: string | null;
  requestId?: string | null;
  callId?: string | null;
  functionName: string;
  feature: string;
  provider: AiProvider;
  model: string;
  promptVersion: string;
}

export interface AiUsageLogRow {
  event_version: typeof AI_OBSERVABILITY_EVENT_VERSION;
  user_id: string | null;
  request_id: string | null;
  call_id: string | null;
  function_name: string;
  feature: string;
  provider: AiProvider;
  model: string;
  prompt_version: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  pricing_version: string;
  pricing_status: PricingStatus;
  token_status: TokenStatus;
  usage_source: UsageSource;
  control_status: ControlStatus;
  latency_ms: number;
  status: UsageStatus;
  outcome: AiOutcome;
  error_code: string | null;
}

export interface AiUsageLogClient {
  from(table: string): {
    insert(row: AiUsageLogRow): PromiseLike<{ error: unknown | null }>;
  };
}

export interface AiUsageControlEventRow {
  event_version: typeof AI_OBSERVABILITY_EVENT_VERSION;
  user_id: string | null;
  request_id: string | null;
  call_id: string | null;
  function_name: string;
  feature: string;
  provider: AiProvider;
  model: string;
  prompt_version: string;
  event_type: "provider_error" | "usage_rejected";
  decision: "observe" | "block";
  outcome: AiOutcome;
  reason: string;
  estimated_cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  metadata: Record<string, unknown>;
}

export interface AiUsageControlEventClient {
  from(table: string): {
    insert(row: AiUsageControlEventRow): PromiseLike<{ error: unknown | null }>;
  };
}

const INPUT_TOKEN_KEYS = ["input_tokens", "prompt_tokens"];
const OUTPUT_TOKEN_KEYS = ["output_tokens", "completion_tokens"];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeTokenCount(value: unknown): number | null {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 ||
    value > AI_MAX_TOKEN_COUNT
  ) {
    return null;
  }
  return value;
}

function firstTokenCount(
  record: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = normalizeTokenCount(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstPresentValue(
  record: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function hasInvalidValue(
  record: Record<string, unknown>,
  keys: string[],
): boolean {
  const value = firstPresentValue(record, keys);
  return value !== undefined && value !== null &&
    normalizeTokenCount(value) === null;
}

export function extractProviderUsage(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const usageMetadata = asRecord(record.usage_metadata);
  if (usageMetadata) return usageMetadata;
  const responseMetadata = asRecord(record.response_metadata);
  if (responseMetadata) {
    const tokenUsage = responseMetadata.tokenUsage ??
      responseMetadata.token_usage ?? responseMetadata.usage;
    if (tokenUsage !== undefined) return tokenUsage;
  }
  return record.usage ?? value;
}

export function normalizeOpenAiUsage(usage: unknown): NormalizedUsage {
  const record = asRecord(extractProviderUsage(usage));
  if (!record) {
    return { inputTokens: null, outputTokens: null, totalTokens: null };
  }

  const inputTokens = firstTokenCount(record, INPUT_TOKEN_KEYS);
  const outputTokens = firstTokenCount(record, OUTPUT_TOKEN_KEYS);
  const reportedTotalTokens = normalizeTokenCount(record.total_tokens);
  const totalTokens = reportedTotalTokens ?? (
    inputTokens !== null && outputTokens !== null
      ? inputTokens + outputTokens
      : null
  );

  return { inputTokens, outputTokens, totalTokens };
}

export function assessOpenAiUsage(params: {
  usage: unknown;
  provider: AiProvider;
  model: string;
  requireOutputTokens: boolean;
  at?: Date | string;
}): UsageAssessment {
  const record = asRecord(extractProviderUsage(params.usage));
  const usage = normalizeOpenAiUsage(params.usage);
  if (!record) {
    return {
      usage,
      tokenStatus: "missing",
      pricingStatus: "not_finalized",
      estimatedCostUsd: null,
    };
  }

  if (
    hasInvalidValue(record, INPUT_TOKEN_KEYS) ||
    hasInvalidValue(record, OUTPUT_TOKEN_KEYS) ||
    hasInvalidValue(record, ["total_tokens"])
  ) {
    return {
      usage,
      tokenStatus: "anomalous",
      pricingStatus: "not_finalized",
      estimatedCostUsd: null,
    };
  }

  if (
    usage.inputTokens !== null && usage.outputTokens !== null &&
    usage.totalTokens !== null &&
    usage.totalTokens !== usage.inputTokens + usage.outputTokens
  ) {
    return {
      usage,
      tokenStatus: "inconsistent",
      pricingStatus: "not_finalized",
      estimatedCostUsd: null,
    };
  }

  if (
    usage.inputTokens === null ||
    (params.requireOutputTokens && usage.outputTokens === null)
  ) {
    return {
      usage,
      tokenStatus: "missing",
      pricingStatus: "not_finalized",
      estimatedCostUsd: null,
    };
  }

  const pricing = resolveAiPricing(params.provider, params.model, params.at);
  if (!pricing) {
    return {
      usage,
      tokenStatus: "valid",
      pricingStatus: "unavailable",
      estimatedCostUsd: null,
    };
  }
  const estimatedCostUsd = calculateAiCostUsd(
    pricing,
    usage.inputTokens,
    usage.outputTokens ?? 0,
  );
  return {
    usage,
    tokenStatus: "valid",
    pricingStatus: estimatedCostUsd === null ? "not_finalized" : "finalized",
    estimatedCostUsd,
  };
}

function normalizeLatencyMs(latencyMs: number): number {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return 0;
  return Math.min(Math.round(latencyMs), 2_147_483_647);
}

function usageSource(value: unknown, tokenStatus: TokenStatus): UsageSource {
  const record = asRecord(extractProviderUsage(value));
  if (tokenStatus === "valid" && record?.usage_source === "input_estimate") {
    return "input_estimate";
  }
  return tokenStatus === "missing" ? "none" : "provider";
}

export function normalizeAiErrorCode(error: unknown): string {
  const record = asRecord(error);
  const code = record?.code;
  if (typeof code === "string" && /^[a-z0-9_:-]{1,80}$/.test(code)) {
    return code;
  }
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return "provider_timeout";
  }
  return "provider_error";
}

export function buildAiUsageLogRow(params: {
  context: AiUsageContext;
  usage: unknown;
  latencyMs: number;
  status: UsageStatus;
  requireOutputTokens: boolean;
  error?: unknown;
  controlStatus?: ControlStatus;
}): AiUsageLogRow {
  const assessment = assessOpenAiUsage({
    usage: params.usage,
    provider: params.context.provider,
    model: params.context.model,
    requireOutputTokens: params.requireOutputTokens,
  });
  const errorCode = params.error === undefined
    ? null
    : normalizeAiErrorCode(params.error);
  return {
    event_version: AI_OBSERVABILITY_EVENT_VERSION,
    user_id: params.context.userId,
    request_id: params.context.requestId ?? null,
    call_id: params.context.callId ?? null,
    function_name: params.context.functionName,
    feature: params.context.feature,
    provider: params.context.provider,
    model: params.context.model,
    prompt_version: params.context.promptVersion,
    input_tokens: assessment.usage.inputTokens,
    output_tokens: assessment.usage.outputTokens,
    total_tokens: assessment.usage.totalTokens,
    estimated_cost_usd: assessment.estimatedCostUsd,
    pricing_version: AI_PRICING_REGISTRY_VERSION,
    pricing_status: assessment.pricingStatus,
    token_status: assessment.tokenStatus,
    usage_source: usageSource(params.usage, assessment.tokenStatus),
    control_status: params.controlStatus ?? "allowed",
    latency_ms: normalizeLatencyMs(params.latencyMs),
    status: params.status,
    outcome: normalizeAiOutcome({ status: params.status, errorCode }),
    error_code: errorCode,
  };
}

export function buildAiUsageControlEventRow(params: {
  context: AiUsageContext;
  usage: unknown;
  eventType: "provider_error" | "usage_rejected";
  reason: string;
  metadata?: Record<string, unknown>;
}): AiUsageControlEventRow {
  const assessment = assessOpenAiUsage({
    usage: params.usage,
    provider: params.context.provider,
    model: params.context.model,
    requireOutputTokens: false,
  });
  return {
    event_version: AI_OBSERVABILITY_EVENT_VERSION,
    user_id: params.context.userId,
    request_id: params.context.requestId ?? null,
    call_id: params.context.callId ?? null,
    function_name: params.context.functionName,
    feature: params.context.feature,
    provider: params.context.provider,
    model: params.context.model,
    prompt_version: params.context.promptVersion,
    event_type: params.eventType,
    decision: params.eventType === "usage_rejected" ? "block" : "observe",
    outcome: params.eventType === "usage_rejected"
      ? "blocked"
      : normalizeAiOutcome({ status: "failure", errorCode: params.reason }),
    reason: params.reason,
    estimated_cost_usd: assessment.estimatedCostUsd,
    input_tokens: assessment.usage.inputTokens,
    output_tokens: assessment.usage.outputTokens,
    metadata: sanitizeAiMetadata(params.metadata),
  };
}

export async function recordAiUsageLog(
  client: AiUsageLogClient,
  row: AiUsageLogRow,
): Promise<void> {
  const { error } = await client.from("ai_usage_logs").insert(row);
  if (error) throw new Error("AI usage log insert failed");
}

export async function recordAiUsageControlEvent(
  client: AiUsageControlEventClient,
  row: AiUsageControlEventRow,
): Promise<void> {
  const { error } = await client.from("ai_usage_control_events").insert(row);
  if (error) throw new Error("AI usage control event insert failed");
}
