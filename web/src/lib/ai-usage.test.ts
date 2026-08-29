import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  aggregateAiUsage,
  aggregateAiUsageByFeatureModel,
  aggregateAiUsageControls,
  getDefaultAiUsageRange,
  parseAiUsageDateRange,
  type AiUsageLogRow,
} from "./ai-usage.ts";

const rows: AiUsageLogRow[] = [
  {
    function_name: "generate-embedding",
    latency_ms: 100,
    status: "success",
    estimated_cost_usd: "0.0012",
    created_at: "2026-08-20T01:00:00.000Z",
  },
  {
    function_name: "generate-embedding",
    latency_ms: 300,
    status: "failure",
    estimated_cost_usd: 0.0008,
    created_at: "2026-08-20T02:00:00.000Z",
  },
  {
    function_name: "reading-insights",
    latency_ms: 50,
    status: "success",
    estimated_cost_usd: null,
    created_at: "2026-08-21T02:00:00.000Z",
  },
];

const summary = aggregateAiUsage(rows);
assert.deepEqual(summary.totals, {
  calls: 3,
  successes: 2,
  failures: 1,
  failureRate: 33.3,
  averageLatencyMs: 150,
  estimatedCostUsd: 0.002,
  unpricedCalls: 1,
  estimatedCalls: 0,
});
assert.deepEqual(summary.functions[0], {
  functionName: "generate-embedding",
  calls: 2,
  successes: 1,
  failures: 1,
  failureRate: 50,
  averageLatencyMs: 200,
  estimatedCostUsd: 0.002,
  unpricedCalls: 0,
  estimatedCalls: 0,
});
assert.equal(summary.daily.length, 2);
assert.deepEqual(aggregateAiUsageByFeatureModel(rows)[0], {
  feature: "generate-embedding",
  model: "unknown",
  calls: 2,
  successes: 1,
  failures: 1,
  failureRate: 50,
  averageLatencyMs: 200,
  estimatedCostUsd: 0.002,
  unpricedCalls: 0,
  estimatedCalls: 0,
});
assert.deepEqual(
  aggregateAiUsageControls([
    { function_name: "generate-embedding", event_type: "reservation_blocked", decision: "block", reason: "hard_cap_exceeded", created_at: "2026-08-20T01:00:00.000Z" },
    { function_name: "generate-embedding", event_type: "provider_error", decision: "observe", reason: "provider_error", created_at: "2026-08-20T01:00:00.000Z" },
  ]),
  {
    total: 2,
    blocked: 1,
    providerErrors: 1,
    usageRejected: 0,
    byReason: [
      { reason: "hard_cap_exceeded", count: 1 },
      { reason: "provider_error", count: 1 },
    ],
  },
);

const defaults = getDefaultAiUsageRange(new Date("2026-08-22T12:00:00.000Z"));
assert.deepEqual(defaults, { from: "2026-08-16", to: "2026-08-22" });
const parsed = parseAiUsageDateRange(
  new URLSearchParams({ from: "2026-08-01", to: "2026-08-31" }),
  new Date("2026-08-22T12:00:00.000Z")
);
assert.equal(parsed.toExclusiveTimestamp, "2026-09-01T00:00:00.000Z");
assert.throws(
  () => parseAiUsageDateRange(new URLSearchParams({ from: "2026-08-01", to: "2026-09-01" })),
  /invalid_date_range/
);

const route = await readFile("src/app/api/admin/ai-usage/route.ts", "utf8");
const executableRoute = route.replace(/^import .*?;$/gm, "");
assert.ok(executableRoute.indexOf("requireAdminUser") < executableRoute.indexOf("createServiceRoleSupabaseClient"));
assert.match(route, /AI_USAGE_COLUMNS = "function_name, feature, provider, model, latency_ms, status, estimated_cost_usd, pricing_status, token_status, usage_source, created_at"/);
assert.match(route, /AI_CONTROL_COLUMNS = "function_name, event_type, decision, reason, created_at"/);
assert.match(route, /filteredControlRows/);
assert.match(route, /ai_usage_control_events/);
assert.equal(route.includes("user_id"), false);
assert.match(route, /status: 401/);
assert.match(route, /status: 500/);

const page = await readFile("src/app/admin/ai-usage/page.tsx", "utf8");
assert.match(page, /type="date"/);
assert.match(page, /estimatedCostUsd/);
assert.match(page, /featureModels/);
assert.match(page, /hardCapUsdPerDay/);
assert.match(page, /requestsPerMinute/);
assert.match(page, /사용자 식별자/);

console.log("AI usage dashboard fixtures passed");
