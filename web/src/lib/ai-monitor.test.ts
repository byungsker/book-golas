import assert from "node:assert/strict";
import { AiMonitorQueryError, loadAiMonitorReport, parseAiMonitorFilters } from "./ai-monitor.ts";

function expectQueryError(params: Record<string, string>, field: string): void {
  assert.throws(
    () => parseAiMonitorFilters(new URLSearchParams(params)),
    (error) => error instanceof AiMonitorQueryError && error.field === field,
  );
}

function assertNoSensitiveKeys(value: unknown): void {
  const sensitiveKeys = new Set(["prompt", "response", "user_id", "authorization", "apiKey", "accessToken", "credential"]);
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveKeys(item);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(sensitiveKeys.has(key), false, `sensitive key leaked: ${key}`);
    assertNoSensitiveKeys(nestedValue);
  }
}

const defaultFilters = parseAiMonitorFilters(new URLSearchParams());
assert.deepEqual(defaultFilters, {
  from: "2026-09-01",
  to: "2026-09-03",
  provider: "all",
  model: "all",
  status: "all",
  outcome: "all",
  errorType: "all",
  page: 1,
  pageSize: 2,
});

expectQueryError({ from: "2026-02-30" }, "from");
expectQueryError({ from: "2026-09-03", to: "2026-09-01" }, "range");
expectQueryError({ from: "2026-09-01", to: "2026-10-02" }, "range");
expectQueryError({ page: "0" }, "page");
expectQueryError({ page: "1001" }, "page");
expectQueryError({ pageSize: "51" }, "pageSize");
expectQueryError({ status: "pending" }, "status");
expectQueryError({ provider: "open ai" }, "provider");

const report = await loadAiMonitorReport(defaultFilters);
assert.deepEqual(report.range, { from: "2026-09-01", to: "2026-09-03" });
assert.equal(report.totals.requests, 5);
assert.equal(report.totals.successes, 1);
assert.equal(report.totals.failures, 3);
assert.equal(report.totals.cancellations, 1);
assert.equal(report.totals.totalTokens, 4450);
assert.equal(report.totals.p95LatencyMs, 5000);
assert.equal(report.health.status, "critical");
assert.deepEqual(report.options.providers, ["anthropic", "google", "openai"]);
assert.deepEqual(report.options.models, [
  "claude-3-5-haiku",
  "claude-3-5-sonnet",
  "gemini-1.5-pro",
  "gpt-4o-mini",
]);
assert.deepEqual(report.recentErrors.map((error) => error.eventId), ["evt-004", "evt-003"]);
assert.equal(report.recentErrors[0]?.errorCode, "quota_exceeded");
assert.equal(report.traces[0]?.eventId, "evt-001");
assertNoSensitiveKeys(report);

const filteredFilters = parseAiMonitorFilters(new URLSearchParams({
  from: "2026-09-01",
  to: "2026-09-02",
  provider: "openai",
  model: "gpt-4o-mini",
  status: "failure",
  outcome: "timeout",
  errorType: "timeout",
  pageSize: "50",
}));
const filteredReport = await loadAiMonitorReport(filteredFilters);
assert.equal(filteredReport.totals.requests, 1);
assert.equal(filteredReport.totals.failures, 1);
assert.equal(filteredReport.recentErrors[0]?.eventId, "evt-003");
assert.equal(filteredReport.recentErrors[0]?.traceId, "trace-003");

console.log("AI monitor behavior contract passed");
