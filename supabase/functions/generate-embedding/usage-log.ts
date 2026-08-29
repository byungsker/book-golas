import {
  type AiUsageLogClient,
  type AiUsageLogRow,
  buildAiUsageLogRow,
  type NormalizedUsage,
  normalizeOpenAiUsage,
  recordAiUsageLog,
} from "../_shared/ai-usage-contract.ts";
import {
  calculateAiCostUsd,
  resolveAiPricing,
} from "../_shared/ai-cost-control.ts";

export const EMBEDDING_FUNCTION_NAME = "generate-embedding";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_PROMPT_VERSION = "embedding-v1";
export const EMBEDDING_COST_PER_MILLION_INPUT_TOKENS_USD = 0.02;

export type { AiUsageLogClient, AiUsageLogRow, NormalizedUsage };

export function estimateEmbeddingCostUsd(
  inputTokens: number | null,
): number | null {
  if (inputTokens === null) return null;
  const pricing = resolveAiPricing("open_ai", EMBEDDING_MODEL);
  return pricing === null ? null : calculateAiCostUsd(pricing, inputTokens, 0);
}

export function buildAiUsageLog(params: {
  userId: string | null;
  usage: NormalizedUsage;
  latencyMs: number;
  status: "success" | "failure";
  errorCode?: string | null;
}): AiUsageLogRow {
  return buildAiUsageLogRow({
    context: {
      userId: params.userId,
      functionName: EMBEDDING_FUNCTION_NAME,
      feature: EMBEDDING_FUNCTION_NAME,
      provider: "open_ai",
      model: EMBEDDING_MODEL,
      promptVersion: EMBEDDING_PROMPT_VERSION,
    },
    usage: {
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      total_tokens: params.usage.totalTokens,
    },
    latencyMs: params.latencyMs,
    status: params.status,
    requireOutputTokens: false,
    error: params.errorCode === null || params.errorCode === undefined
      ? undefined
      : { code: params.errorCode },
  });
}

export async function recordAiUsage(
  client: AiUsageLogClient,
  row: AiUsageLogRow,
): Promise<void> {
  await recordAiUsageLog(client, row);
}

export { normalizeOpenAiUsage };
