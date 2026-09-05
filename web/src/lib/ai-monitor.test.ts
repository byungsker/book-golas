import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AiMonitorQueryError, loadAiMonitorReport, parseAiMonitorFilters } from "./ai-monitor.ts";

const route = await readFile("src/app/api/admin/ai-monitor/route.ts", "utf8");
const page = await readFile("src/app/admin/ai-monitor/page.tsx", "utf8");
const tables = await readFile("src/app/admin/ai-monitor/monitor-tables.tsx", "utf8");
const proxy = await readFile("src/proxy.ts", "utf8");
const monitor = await readFile("src/lib/ai-monitor.ts", "utf8");
const access = await readFile("src/lib/ai-monitor-access.ts", "utf8");
const nextConfig = await readFile("next.config.ts", "utf8");

assert.match(route, /^import "server-only";/);
assert.match(page, /^import "server-only";/);
const handler = route.slice(route.indexOf("export async function GET"));
assert.ok(handler.indexOf("requireAdminUser") < handler.indexOf("loadAiMonitorReport"));
assert.match(route, /status: 401/);
assert.match(route, /status: 400/);
assert.match(route, /status: 500/);
assert.match(route, /Cache-Control.*no-store/);
for (const sensitiveField of ["prompt", "response", "user_id", "authorization", "apiKey", "accessToken", "credential"]) {
  assert.equal(route.includes(`"${sensitiveField}"`), false);
}
assert.match(monitor, /ai-monitor\/src\/core\.mjs/);
assert.match(monitor, /await import\(\/\* webpackIgnore: true \*\/ resolve\(repositoryRoot, CORE_PATH\)\)/);
assert.doesNotMatch(monitor, /getBuiltinModule|createRequire/);
assert.match(monitor, /ai-monitor\/fixtures\/events\.json/);
assert.match(monitor, /MAX_RANGE_DAYS/);
assert.match(monitor, /MAX_PAGE_SIZE/);
assert.match(monitor, /2026-09-01/);
assert.match(monitor, /2026-09-03/);
assert.match(page, /name="provider"/);
assert.match(page, /name="model"/);
assert.match(page, /name="status"/);
assert.match(page, /name="outcome"/);
assert.match(page, /name="errorType"/);
assert.match(tables, /TableCaption/);
assert.match(tables, /DialogTitle/);
assert.match(tables, /DialogDescription/);
assert.match(page, /pricingVersions/);
assert.match(page, /Preview fixture/);
assert.match(proxy, /\/admin\/ai-monitor/);
assert.match(proxy, /isAiMonitorDemoRequest/);
assert.match(route, /isAiMonitorDemoRequest/);
assert.match(access, /AI_MONITOR_LOCAL_DEMO/);
assert.match(access, /AI_MONITOR_PREVIEW_DEMO/);
assert.match(access, /VERCEL_ENV === "preview"/);
assert.match(access, /VERCEL_URL/);
assert.match(nextConfig, /outputFileTracingRoot/);
assert.match(nextConfig, /outputFileTracingIncludes/);
assert.match(nextConfig, /ai-monitor\/src\/core\.mjs/);
assert.match(nextConfig, /ai-monitor\/fixtures\/events\.json/);

assert.throws(
  () => parseAiMonitorFilters(new URLSearchParams({ from: "2026-02-30" })),
  (error) => error instanceof AiMonitorQueryError && error.field === "from",
);
assert.throws(
  () => parseAiMonitorFilters(new URLSearchParams({ from: "2026-09-03", to: "2026-09-01" })),
  (error) => error instanceof AiMonitorQueryError && error.field === "range",
);
assert.deepEqual(parseAiMonitorFilters(new URLSearchParams()), {
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
assert.throws(
  () => parseAiMonitorFilters(new URLSearchParams({ page: "0" })),
  (error) => error instanceof AiMonitorQueryError && error.field === "page",
);
assert.throws(
  () => parseAiMonitorFilters(new URLSearchParams({ page: "1001" })),
  (error) => error instanceof AiMonitorQueryError && error.field === "page",
);
assert.throws(
  () => parseAiMonitorFilters(new URLSearchParams({ pageSize: "51" })),
  (error) => error instanceof AiMonitorQueryError && error.field === "pageSize",
);
assert.deepEqual((await loadAiMonitorReport(parseAiMonitorFilters(new URLSearchParams()))).range, {
  from: "2026-09-01",
  to: "2026-09-03",
});

console.log("AI monitor source contract passed");
