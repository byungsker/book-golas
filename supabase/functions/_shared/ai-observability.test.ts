import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  calculateAiHealth,
  normalizeAiOutcome,
  sanitizeAiMetadata,
} from "./ai-observability.ts";
import {
  buildAiUsageControlEventRow,
  buildAiUsageLogRow,
} from "./ai-usage-contract.ts";

const context = {
  userId: "user-a",
  requestId: "req-123",
  callId: "call-123",
  functionName: "recall-search",
  feature: "recall-search.answer",
  provider: "open_ai" as const,
  model: "gpt-4o-mini",
  promptVersion: "recall-answer-v1",
};

Deno.test("outcome mapper distinguishes timeout and rate limit", () => {
  assertEquals(
    normalizeAiOutcome({ status: "failure", errorCode: "provider_timeout" }),
    "timeout",
  );
  assertEquals(
    normalizeAiOutcome({ status: "failure", errorCode: "rate_limit_exceeded" }),
    "rate_limited",
  );
  assertEquals(
    normalizeAiOutcome({ status: "success", errorCode: null }),
    "success",
  );
});

Deno.test("usage rows retain correlation but never retain provider error text", () => {
  const error = new Error("provider response secret");
  error.name = "AbortError";
  const row = buildAiUsageLogRow({
    context,
    usage: undefined,
    latencyMs: 12,
    status: "failure",
    requireOutputTokens: true,
    error,
  });

  assertEquals(row.event_version, 1);
  assertEquals(row.request_id, "req-123");
  assertEquals(row.call_id, "call-123");
  assertEquals(row.outcome, "timeout");
  assertEquals(row.error_code, "provider_timeout");
  assert(!JSON.stringify(row).includes("provider response secret"));
});

Deno.test("control rows use safe metadata only", () => {
  const row = buildAiUsageControlEventRow({
    context,
    usage: undefined,
    eventType: "usage_rejected",
    reason: "invalid_token_usage",
    metadata: {
      projectedCostUsd: 0.01,
      prompt: "must not persist",
      providerPayload: "must not persist",
    },
  });

  assertEquals(row.event_version, 1);
  assertEquals(row.request_id, "req-123");
  assertEquals(row.call_id, "call-123");
  assertEquals(row.outcome, "blocked");
  assertEquals(row.metadata, { projectedCostUsd: 0.01 });
});

Deno.test("metadata sanitizer drops sensitive keys and nested values", () => {
  assertEquals(
    sanitizeAiMetadata({
      sampleCount: 3,
      prompt: "secret",
      nested: { response: "secret" },
      stack: "secret",
    }),
    { sampleCount: 3 },
  );
});

Deno.test("health is unknown when evidence is unavailable or truncated", () => {
  assertEquals(
    calculateAiHealth({
      latestEventAt: null,
      now: "2026-09-03T00:00:00.000Z",
      freshnessLimitMs: 120_000,
      allowedReservations: 0,
      terminalEvents: 0,
      queryOk: true,
      truncated: false,
    }),
    {
      status: "unknown",
      coveragePercent: null,
      missingTerminalEvents: 0,
      freshnessMs: null,
    },
  );
  assertEquals(
    calculateAiHealth({
      latestEventAt: "2026-09-03T00:00:00.000Z",
      now: "2026-09-03T00:01:00.000Z",
      freshnessLimitMs: 120_000,
      allowedReservations: 2,
      terminalEvents: 2,
      queryOk: true,
      truncated: true,
    }).status,
    "unknown",
  );
});

Deno.test("health reports missing terminal events as a warning", () => {
  assertEquals(
    calculateAiHealth({
      latestEventAt: "2026-09-03T00:00:00.000Z",
      now: "2026-09-03T00:01:00.000Z",
      freshnessLimitMs: 120_000,
      allowedReservations: 3,
      terminalEvents: 2,
      queryOk: true,
      truncated: false,
    }),
    {
      status: "warning",
      coveragePercent: 66.7,
      missingTerminalEvents: 1,
      freshnessMs: 60_000,
    },
  );
});
