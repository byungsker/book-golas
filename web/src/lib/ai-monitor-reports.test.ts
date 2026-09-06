import assert from "node:assert/strict";
import { loadAiMonitorReport } from "./ai-monitor.ts";
import { buildMonitorInsights, buildReportRows, parseMonitorReportRange, reportFilters } from "./ai-monitor-reports.ts";

const dayRange = parseMonitorReportRange(new URLSearchParams({ period: "day" }));
assert.deepEqual(dayRange, { period: "day", from: "2026-09-01", to: "2026-09-30" });

const monthRange = parseMonitorReportRange(new URLSearchParams({ period: "month", anchor: "2026-09-03" }));
assert.deepEqual(monthRange, { period: "month", from: "2026-09-01", to: "2026-09-30" });

const quarterRange = parseMonitorReportRange(new URLSearchParams({ period: "quarter", anchor: "2026-09-03" }));
assert.deepEqual(quarterRange, { period: "quarter", from: "2026-07-01", to: "2026-09-30" });

const yearRange = parseMonitorReportRange(new URLSearchParams({ period: "year", anchor: "2026-09-03" }));
assert.deepEqual(yearRange, { period: "year", from: "2026-01-01", to: "2026-12-31" });

const customRange = parseMonitorReportRange(new URLSearchParams({ period: "custom", from: "2026-09-02", to: "2026-09-03" }));
assert.deepEqual(customRange, { period: "custom", from: "2026-09-02", to: "2026-09-03" });

const report = await loadAiMonitorReport(reportFilters(monthRange));
const quarterReport = await loadAiMonitorReport(reportFilters(quarterRange));
assert.deepEqual(quarterReport.range, { from: "2026-07-01", to: "2026-09-30" });
assert.equal(quarterReport.totals.requests, 5);
const yearReport = await loadAiMonitorReport(reportFilters(yearRange));
assert.deepEqual(yearReport.range, { from: "2026-01-01", to: "2026-12-31" });
assert.equal(yearReport.totals.requests, 5);
assert.deepEqual(buildReportRows(report, "day").map(({ key, requests, totalTokens, costUsd, p95LatencyMs }) => ({ key, requests, totalTokens, costUsd, p95LatencyMs })), [
  { key: "2026-09-01", requests: 2, totalTokens: 3600, costUsd: 0.00795, p95LatencyMs: 2000 },
  { key: "2026-09-02", requests: 2, totalTokens: 700, costUsd: 0.000545, p95LatencyMs: 4000 },
  { key: "2026-09-03", requests: 1, totalTokens: 150, costUsd: 0.00028, p95LatencyMs: 5000 },
]);
assert.deepEqual(buildReportRows(report, "month").map(({ key, requests, totalTokens, costUsd, p95LatencyMs }) => ({ key, requests, totalTokens, costUsd, p95LatencyMs })), [
  { key: "2026-09", requests: 5, totalTokens: 4450, costUsd: 0.008775, p95LatencyMs: 5000 },
]);
assert.equal(buildReportRows(report, "quarter")[0]?.key, "2026 Q3");
assert.equal(buildReportRows(report, "year")[0]?.key, "2026");
assert.equal(buildReportRows(report, "custom")[0]?.requests, 5);
assert.match(buildMonitorInsights(report)[0]?.title ?? "", /p95 latency/);

console.log("AI monitor report behavior contract passed");
