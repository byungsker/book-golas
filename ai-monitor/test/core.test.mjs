import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRICING_CATALOG,
  aggregateReport,
  createPricingAdapter,
  createSafeEventSink,
  filterEvents,
  normalizeEvent,
  normalizeEvents,
} from "../src/core.mjs";

const rawEvents = JSON.parse(
  await readFile(new URL("../fixtures/events.json", import.meta.url), "utf8"),
);

test("normalizes exact canonical outcomes without retaining sensitive input", () => {
  const events = normalizeEvents(rawEvents);

  assert.deepEqual(events[0], {
    schemaVersion: "1",
    eventId: "evt-001",
    timestamp: "2026-09-01T08:00:00.000Z",
    provider: "openai",
    model: "gpt-4o-mini",
    feature: "book-summary",
    status: "success",
    outcome: "success",
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    latencyMs: 1000,
    ttftMs: 100,
    costUsd: 0.00045,
    retryCount: 0,
    errorType: null,
    errorCode: null,
    traceId: "trace-001",
    correlationId: "corr-001",
    spanId: "span-001",
    pricingVersion: "2026-09-01",
  });
  assert.deepEqual(
    events.map(({ provider, model, status, outcome, errorType, traceId, pricingVersion }) => ({
      provider,
      model,
      status,
      outcome,
      errorType,
      traceId,
      pricingVersion,
    })),
    [
      { provider: "openai", model: "gpt-4o-mini", status: "success", outcome: "success", errorType: null, traceId: "trace-001", pricingVersion: "2026-09-01" },
      { provider: "anthropic", model: "claude-3-5-sonnet", status: "failure", outcome: "failure", errorType: "provider_error", traceId: "trace-002", pricingVersion: "2026-09-01" },
      { provider: "openai", model: "gpt-4o-mini", status: "failure", outcome: "timeout", errorType: "timeout", traceId: "trace-003", pricingVersion: "2026-09-01" },
      { provider: "google", model: "gemini-1.5-pro", status: "failure", outcome: "rate_limited", errorType: "rate_limit", traceId: "trace-004", pricingVersion: "2026-09-01" },
      { provider: "anthropic", model: "claude-3-5-haiku", status: "cancelled", outcome: "cancelled", errorType: "cancelled", traceId: "trace-005", pricingVersion: "2026-09-01" },
    ],
  );
  assert.equal(rawEvents.some((event) => ["prompt", "response", "user", "userId", "authorization", "apiKey", "accessToken", "credential"].some((field) => field in event)), false);
  const sensitiveRawEvent = {
    ...rawEvents[0],
    prompt: "private prompt",
    response: "private response",
    user: { id: "user-private-001" },
    authorization: "Bearer private-token",
    apiKey: "sk-private",
    accessToken: "private-access-token",
    credential: "private-credential",
  };
  const redactedEvent = normalizeEvent(sensitiveRawEvent);
  assert.doesNotMatch(JSON.stringify(events), /prompt|response|user|authorization|apiKey|accessToken|credential|private/i);
  assert.doesNotMatch(JSON.stringify(redactedEvent), /prompt|response|user|authorization|apiKey|accessToken|credential|private/i);
});

test("rejects malformed events deterministically", () => {
  assert.throws(
    () => normalizeEvent({ eventId: "broken", outcome: "success" }),
    { name: "EventValidationError", message: "Invalid event field: timestamp" },
  );
  assert.throws(
    () => normalizeEvent({ ...rawEvents[0], inputTokens: -1 }),
    { name: "EventValidationError", message: "Invalid event field: inputTokens" },
  );
});

test("uses an explicit versioned provider pricing adapter", () => {
  const pricing = createPricingAdapter(PRICING_CATALOG, "2026-09-01");

  assert.equal(pricing.version, "2026-09-01");
  assert.equal(pricing.calculate("openai", "gpt-4o-mini", { inputTokens: 1000, outputTokens: 500 }), 0.00045);
  assert.throws(
    () => pricing.calculate("unknown", "missing", { inputTokens: 1, outputTokens: 1 }),
    { name: "PricingError", message: "No pricing for unknown/missing in 2026-09-01" },
  );
});

test("filters only supported canonical fields with deterministic bounds", () => {
  const events = normalizeEvents(rawEvents);

  assert.deepEqual(
    filterEvents(events, { provider: "openai", status: "failure" }).map((event) => event.eventId),
    ["evt-003"],
  );
  assert.deepEqual(
    filterEvents(events, { from: "2026-09-02T00:00:00.000Z", to: "2026-09-03T00:00:00.000Z" }).map((event) => event.eventId),
    ["evt-003", "evt-004"],
  );
  assert.deepEqual(
    filterEvents(events, { model: "gpt-4o-mini", outcome: "success", traceId: "trace-001" }).map((event) => event.eventId),
    ["evt-001"],
  );
  assert.throws(
    () => filterEvents(events, { prompt: "private prompt" }),
    { name: "FilterValidationError", message: "Unsupported filter: prompt" },
  );
});

test("aggregates exact totals, performance, usage, errors, and traces", () => {
  const report = aggregateReport(normalizeEvents(rawEvents));

  assert.deepEqual(report.totals, {
    requests: 5,
    successes: 1,
    failures: 3,
    cancellations: 1,
    inputTokens: 3800,
    outputTokens: 650,
    totalTokens: 4450,
    latencyMs: 15000,
    averageLatencyMs: 3000,
    p95LatencyMs: 5000,
    ttftMs: 1500,
    averageTtftMs: 300,
    p95TtftMs: 500,
    costUsd: 0.008775,
    errorRate: 0.6,
  });
  assert.deepEqual(report.daily, [
    { key: "2026-09-01", requests: 2, inputTokens: 3000, outputTokens: 600, totalTokens: 3600, latencyMs: 3000, ttftMs: 300, costUsd: 0.00795, errors: 1, cancellations: 0 },
    { key: "2026-09-02", requests: 2, inputTokens: 700, outputTokens: 0, totalTokens: 700, latencyMs: 7000, ttftMs: 700, costUsd: 0.000545, errors: 2, cancellations: 0 },
    { key: "2026-09-03", requests: 1, inputTokens: 100, outputTokens: 50, totalTokens: 150, latencyMs: 5000, ttftMs: 500, costUsd: 0.00028, errors: 0, cancellations: 1 },
  ]);
  assert.deepEqual(report.providers.map(({ key, requests, totalTokens, costUsd, errors, cancellations }) => ({ key, requests, totalTokens, costUsd, errors, cancellations })), [
    { key: "anthropic", requests: 2, totalTokens: 2250, costUsd: 0.00778, errors: 1, cancellations: 1 },
    { key: "google", requests: 1, totalTokens: 400, costUsd: 0.0005, errors: 1, cancellations: 0 },
    { key: "openai", requests: 2, totalTokens: 1800, costUsd: 0.000495, errors: 1, cancellations: 0 },
  ]);
  assert.deepEqual(report.models.map(({ key, requests, totalTokens, costUsd, errors, cancellations }) => ({ key, requests, totalTokens, costUsd, errors, cancellations })), [
    { key: "claude-3-5-haiku", requests: 1, totalTokens: 150, costUsd: 0.00028, errors: 0, cancellations: 1 },
    { key: "claude-3-5-sonnet", requests: 1, totalTokens: 2100, costUsd: 0.0075, errors: 1, cancellations: 0 },
    { key: "gemini-1.5-pro", requests: 1, totalTokens: 400, costUsd: 0.0005, errors: 1, cancellations: 0 },
    { key: "gpt-4o-mini", requests: 2, totalTokens: 1800, costUsd: 0.000495, errors: 1, cancellations: 0 },
  ]);
  assert.deepEqual(report.featureModels.map(({ feature, provider, model, requests, totalTokens, costUsd, errors, cancellations }) => ({ feature, provider, model, requests, totalTokens, costUsd, errors, cancellations })), [
    { feature: "book-summary", provider: "openai", model: "gpt-4o-mini", requests: 1, totalTokens: 1500, costUsd: 0.00045, errors: 0, cancellations: 0 },
    { feature: "chat", provider: "anthropic", model: "claude-3-5-haiku", requests: 1, totalTokens: 150, costUsd: 0.00028, errors: 0, cancellations: 1 },
    { feature: "embedding-labels", provider: "google", model: "gemini-1.5-pro", requests: 1, totalTokens: 400, costUsd: 0.0005, errors: 1, cancellations: 0 },
    { feature: "note-structure", provider: "openai", model: "gpt-4o-mini", requests: 1, totalTokens: 300, costUsd: 0.000045, errors: 1, cancellations: 0 },
    { feature: "recommendations", provider: "anthropic", model: "claude-3-5-sonnet", requests: 1, totalTokens: 2100, costUsd: 0.0075, errors: 1, cancellations: 0 },
  ]);
  assert.deepEqual(report.recentErrors.map(({ eventId, outcome, errorType, errorCode }) => ({ eventId, outcome, errorType, errorCode })), [
    { eventId: "evt-004", outcome: "rate_limited", errorType: "rate_limit", errorCode: "quota_exceeded" },
    { eventId: "evt-003", outcome: "timeout", errorType: "timeout", errorCode: "deadline_exceeded" },
    { eventId: "evt-002", outcome: "failure", errorType: "provider_error", errorCode: "upstream_500" },
  ]);
  assert.deepEqual(report.traces[0], {
    eventId: "evt-001",
    traceId: "trace-001",
    correlationId: "corr-001",
    spanId: "span-001",
    timestamp: "2026-09-01T08:00:00.000Z",
    provider: "openai",
    model: "gpt-4o-mini",
    status: "success",
    outcome: "success",
  });
  assert.deepEqual(report.traces[4], {
    eventId: "evt-005",
    traceId: "trace-005",
    correlationId: "corr-005",
    spanId: "span-005",
    timestamp: "2026-09-03T12:00:00.000Z",
    provider: "anthropic",
    model: "claude-3-5-haiku",
    status: "cancelled",
    outcome: "cancelled",
  });
  assert.deepEqual(report.pricingVersions, ["2026-09-01"]);
});

test("event sink never throws into sync or async callers", async () => {
  const syncFailure = createSafeEventSink(() => {
    throw new Error("sink unavailable");
  });
  const asyncFailure = createSafeEventSink(async () => {
    throw new Error("sink rejected");
  });
  const received = [];
  const success = createSafeEventSink(async (event) => received.push(event));

  assert.deepEqual(await syncFailure(rawEvents[0]), { accepted: false });
  assert.deepEqual(await asyncFailure(rawEvents[0]), { accepted: false });
  assert.deepEqual(await syncFailure({ broken: true }), { accepted: false });
  assert.deepEqual(await success(rawEvents[0]), { accepted: true });
  assert.equal(received.length, 1);
  assert.equal(received[0].eventId, "evt-001");
  assert.equal("prompt" in received[0], false);
});
