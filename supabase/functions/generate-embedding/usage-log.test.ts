import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts";
import {
  type AiUsageLogClient,
  type AiUsageLogRow,
  buildAiUsageLog,
  estimateEmbeddingCostUsd,
  normalizeOpenAiUsage,
  recordAiUsage,
} from "./usage-log.ts";

class MockUsageLogClient implements AiUsageLogClient {
  table: string | null = null;
  row: AiUsageLogRow | null = null;
  error: unknown | null = null;

  from(table: string) {
    return {
      insert: (row: AiUsageLogRow) => {
        this.table = table;
        this.row = row;
        return Promise.resolve({ error: this.error });
      },
    };
  }
}

describe("AI usage log contract", () => {
  it("normalizes current OpenAI token fields", () => {
    assertEquals(
      normalizeOpenAiUsage({
        input_tokens: 42,
        output_tokens: 0,
        total_tokens: 42,
      }),
      { inputTokens: 42, outputTokens: 0, totalTokens: 42 },
    );
  });

  it("normalizes legacy embedding token fields", () => {
    assertEquals(
      normalizeOpenAiUsage({
        prompt_tokens: 25,
        completion_tokens: 3,
        total_tokens: 28,
      }),
      { inputTokens: 25, outputTokens: 3, totalTokens: 28 },
    );
  });

  it("ignores malformed usage values", () => {
    assertEquals(normalizeOpenAiUsage({ input_tokens: -1 }), {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    });
  });

  it("calculates an input-token cost estimate", () => {
    assertEquals(estimateEmbeddingCostUsd(1_000_000), 0.02);
    assertEquals(estimateEmbeddingCostUsd(null), null);
  });

  it("builds a privacy-safe success row", () => {
    const row = buildAiUsageLog({
      userId: "user-1",
      usage: { inputTokens: 12, outputTokens: null, totalTokens: 12 },
      latencyMs: 14.6,
      status: "success",
    });

    assertEquals(row.status, "success");
    assertEquals(row.latency_ms, 15);
    assertEquals(row.estimated_cost_usd, 0.00000024);
    assertEquals(
      Object.keys(row).filter((key) =>
        ["content_text", "embedding", "prompt", "query", "response"].includes(
          key,
        )
      ),
      [],
    );
  });

  it("records a failure row through the service client", async () => {
    const client = new MockUsageLogClient();
    const row = buildAiUsageLog({
      userId: "user-1",
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      latencyMs: 80,
      status: "failure",
      errorCode: "openai_http_429",
    });

    await recordAiUsage(client, row);

    assertEquals(client.table, "ai_usage_logs");
    assertEquals(client.row, row);
    assert(row.error_code === "openai_http_429");
  });

  it("does not expose insert errors", async () => {
    const client = new MockUsageLogClient();
    client.error = { message: "database details" };

    await assertRejects(
      () =>
        recordAiUsage(
          client,
          buildAiUsageLog({
            userId: "user-1",
            usage: { inputTokens: null, outputTokens: null, totalTokens: null },
            latencyMs: 1,
            status: "failure",
            errorCode: "openai_request_failed",
          }),
        ),
      Error,
      "AI usage log insert failed",
    );
  });
});
