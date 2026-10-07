import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  assessOpenAiUsage,
  buildAiUsageControlEventRow,
  buildAiUsageLogRow,
  extractProviderUsage,
  normalizeOpenAiUsage,
} from "./ai-usage-contract.ts";

const context = {
  userId: "user-a",
  functionName: "recall-search",
  feature: "recall-search.answer",
  provider: "open_ai" as const,
  model: "gpt-4o-mini",
  promptVersion: "recall-answer-v1",
};

Deno.test("usage contract reads LangChain usage metadata", () => {
  const response = {
    usage_metadata: { input_tokens: 100, output_tokens: 25, total_tokens: 125 },
  };
  assertEquals(extractProviderUsage(response), response.usage_metadata);
  assertEquals(normalizeOpenAiUsage(response), {
    inputTokens: 100,
    outputTokens: 25,
    totalTokens: 125,
  });
  assertEquals(
    assessOpenAiUsage({
      usage: response,
      provider: "open_ai",
      model: "gpt-4o-mini",
      requireOutputTokens: true,
    }).tokenStatus,
    "valid",
  );
});

Deno.test("usage contract rejects anomalous and inconsistent tokens", () => {
  assertEquals(
    assessOpenAiUsage({
      usage: { input_tokens: -1, output_tokens: 1, total_tokens: 0 },
      provider: "open_ai",
      model: "gpt-4o-mini",
      requireOutputTokens: true,
    }).tokenStatus,
    "anomalous",
  );
  assertEquals(
    assessOpenAiUsage({
      usage: { input_tokens: 10, output_tokens: 2, total_tokens: 99 },
      provider: "open_ai",
      model: "gpt-4o-mini",
      requireOutputTokens: true,
    }).tokenStatus,
    "inconsistent",
  );
});

Deno.test("usage log finalizes only valid priced usage", () => {
  const row = buildAiUsageLogRow({
    context,
    usage: { input_tokens: 1000, output_tokens: 500, total_tokens: 1500 },
    latencyMs: 18.4,
    status: "success",
    requireOutputTokens: true,
  });
  assertEquals(row.estimated_cost_usd, 0.00045);
  assertEquals(row.pricing_status, "finalized");
  assertEquals(row.token_status, "valid");
  assertEquals(row.feature, "recall-search.answer");
  assertEquals(row.error_code, null);
});

Deno.test("usage log preserves bounded input-estimate provenance", () => {
  const row = buildAiUsageLogRow({
    context: {
      ...context,
      model: "text-embedding-3-small",
      feature: "recommend-next-books.interest-embedding",
    },
    usage: {
      input_tokens: 10,
      output_tokens: 0,
      total_tokens: 10,
      usage_source: "input_estimate",
    },
    latencyMs: 4,
    status: "success",
    requireOutputTokens: false,
  });
  assertEquals(row.usage_source, "input_estimate");
  assertEquals(row.pricing_status, "finalized");
});

Deno.test("usage log separates missing tokens from provider failure", () => {
  const row = buildAiUsageLogRow({
    context,
    usage: undefined,
    latencyMs: 9,
    status: "failure",
    requireOutputTokens: true,
    error: new Error("provider response body must not be stored"),
  });
  assertEquals(row.estimated_cost_usd, null);
  assertEquals(row.pricing_status, "not_finalized");
  assertEquals(row.token_status, "missing");
  assertEquals(row.error_code, "provider_error");
});

Deno.test("control events contain bounded operational metadata only", () => {
  const event = buildAiUsageControlEventRow({
    context,
    usage: { input_tokens: 10, output_tokens: 1, total_tokens: 11 },
    eventType: "usage_rejected",
    reason: "invalid_token_usage",
  });
  assertEquals(event.decision, "block");
  assertEquals(event.reason, "invalid_token_usage");
  assertEquals(event.metadata, {});
  assert(!JSON.stringify(event).includes("provider response body"));
});
