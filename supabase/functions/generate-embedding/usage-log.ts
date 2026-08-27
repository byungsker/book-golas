export const EMBEDDING_FUNCTION_NAME = "generate-embedding";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_PROMPT_VERSION = "embedding-v1";
export const EMBEDDING_COST_PER_MILLION_INPUT_TOKENS_USD = 0.02;

export type UsageStatus = "success" | "failure";

export interface NormalizedUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AiUsageLogRow {
  user_id: string | null;
  function_name: string;
  model: string;
  prompt_version: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number;
  status: UsageStatus;
  error_code: string | null;
}

interface UsageLogInsertResult {
  error: unknown | null;
}

export interface AiUsageLogClient {
  from(table: string): {
    insert(row: AiUsageLogRow): PromiseLike<UsageLogInsertResult>;
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeTokenCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
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
    if (value !== null) {
      return value;
    }
  }
  return null;
}

export function normalizeOpenAiUsage(usage: unknown): NormalizedUsage {
  const record = asRecord(usage);
  if (!record) {
    return { inputTokens: null, outputTokens: null, totalTokens: null };
  }

  const inputTokens = firstTokenCount(record, [
    "input_tokens",
    "prompt_tokens",
  ]);
  const outputTokens = firstTokenCount(record, [
    "output_tokens",
    "completion_tokens",
  ]);
  const reportedTotalTokens = normalizeTokenCount(record.total_tokens);
  const totalTokens = reportedTotalTokens ?? (
    inputTokens !== null && outputTokens !== null
      ? inputTokens + outputTokens
      : null
  );

  return { inputTokens, outputTokens, totalTokens };
}

export function estimateEmbeddingCostUsd(
  inputTokens: number | null,
): number | null {
  if (inputTokens === null) {
    return null;
  }
  return Number(
    ((inputTokens * EMBEDDING_COST_PER_MILLION_INPUT_TOKENS_USD) / 1_000_000)
      .toFixed(8),
  );
}

function normalizeLatencyMs(latencyMs: number): number {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) {
    return 0;
  }
  return Math.min(Math.round(latencyMs), 2_147_483_647);
}

function normalizeErrorCode(
  errorCode: string | null | undefined,
): string | null {
  if (!errorCode) {
    return null;
  }
  const normalized = errorCode.trim().slice(0, 120);
  return normalized.length > 0 ? normalized : null;
}

export function buildAiUsageLog(params: {
  userId: string | null;
  usage: NormalizedUsage;
  latencyMs: number;
  status: UsageStatus;
  errorCode?: string | null;
}): AiUsageLogRow {
  return {
    user_id: params.userId,
    function_name: EMBEDDING_FUNCTION_NAME,
    model: EMBEDDING_MODEL,
    prompt_version: EMBEDDING_PROMPT_VERSION,
    input_tokens: params.usage.inputTokens,
    output_tokens: params.usage.outputTokens,
    total_tokens: params.usage.totalTokens,
    estimated_cost_usd: estimateEmbeddingCostUsd(params.usage.inputTokens),
    latency_ms: normalizeLatencyMs(params.latencyMs),
    status: params.status,
    error_code: normalizeErrorCode(params.errorCode),
  };
}

export async function recordAiUsage(
  client: AiUsageLogClient,
  row: AiUsageLogRow,
): Promise<void> {
  const { error } = await client.from("ai_usage_logs").insert(row);
  if (error) {
    throw new Error("AI usage log insert failed");
  }
}
