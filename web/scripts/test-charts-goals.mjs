import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/charts-goals-contract.json"),
  fixture: path.join(root, "scripts/fixtures/charts-goals-negative.json"),
  manifest: path.join(root, "package.json"),
  source: path.join(root, "src/lib/product/contracts/charts-goals.ts"),
  sourceTest: path.join(root, "src/lib/product/contracts/charts-goals.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/charts-goals-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/charts-goals-fixtures.test.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  page: path.join(root, "src/app/[locale]/(consumer)/stats/page.tsx"),
  loading: path.join(root, "src/app/[locale]/(consumer)/stats/loading.tsx"),
  error: path.join(root, "src/app/[locale]/(consumer)/stats/error.tsx"),
  client: path.join(root, "src/components/consumer/reading-analytics-client.tsx"),
  api: path.join(root, "src/app/api/consumer/charts-goals/route.ts"),
  e2e: path.join(root, "tests/e2e/charts-goals.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing charts/goals ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty charts/goals ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 440 && contract.task === 27, "charts/goals contract must bind issue 440/task 27");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "charts/goals contract must reference the parity plan");
  requireCondition(contract.timeZone === "Asia/Seoul", "charts/goals contract must use KST");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "stale", "invalid-range", "foreign", "deleted"]) requireCondition(contract.states.includes(state), `charts/goals contract must cover ${state}`);
  for (const operation of ["select-tab", "select-period", "navigate-period", "select-status", "choose-custom-range", "save-goal", "refresh-after-goal", "share-card", "clipboard-fallback", "download-fallback", "owner-scope", "kst-boundary"]) requireCondition(contract.operations.includes(operation), `charts/goals contract must cover ${operation}`);
  requireCondition(contract.native.periods.join(",") === "annual,monthly,weekly,custom", "native chart periods must be preserved");
  requireCondition(fixture.issue === 440 && fixture.task === 27 && fixture.fixtures.length >= 8, "charts/goals negative fixtures are incomplete");
  requireCondition(manifest.scripts["test:charts-goals"] === "node scripts/test-charts-goals.mjs && vitest run src/lib/product/contracts/charts-goals.test.ts src/lib/consumer/charts-goals-fixtures.test.ts src/app/api/consumer/charts-goals/route.test.ts", "package must expose the exact charts/goals acceptance command");
  requireCondition(manifest.scripts["test:charts-goals:negative"] === "node scripts/test-charts-goals.mjs --fixture timezone && node scripts/test-charts-goals.mjs --fixture foreign && node scripts/test-charts-goals.mjs --fixture deleted && node scripts/test-charts-goals.mjs --fixture unauthorized && node scripts/test-charts-goals.mjs --fixture invalid-range && node scripts/test-charts-goals.mjs --fixture stale", "package must expose the charts/goals negative command");
  requireCondition(source.source.includes('CHARTS_GOALS_TIME_ZONE = CALENDAR_TIME_ZONE') && source.source.includes("page - event.previousPage") && source.source.includes("Asia/Seoul"), "contract must make KST and page delta semantics explicit");
  requireCondition(source.source.includes("reading_sessions") || source.source.includes("durationSeconds"), "contract must expose session seconds");
  requireCondition(source.source.includes("ReadingAnalyticsRequestSchema") && source.source.includes("ReadingGoalUpdateRequestSchema") && source.source.includes("ReadingAnalyticsDataSchema"), "contract must validate request, goal and response shapes");
  requireCondition(source.queries.includes("fetchOwnedReadingAnalyticsData") && source.queries.includes('from("reading_progress_history")') && source.queries.includes('from("reading_sessions")') && source.queries.includes('from("reading_goals")'), "query must read every server source");
  requireCondition(source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)') && source.queries.includes("buildReadingAnalytics"), "query must enforce owner and active-book scope");
  requireCondition(source.fixtureSource.includes("getCalendarFixtureSources") && source.fixtureSource.includes("charts-goals-empty") && source.fixtureSource.includes("charts-goals-stale"), "fixtures must reuse calendar source events and cover empty/stale");
  requireCondition(source.routeFixture.includes('"charts-goals-happy"') && source.proxy.includes('startsWith("charts-goals-")'), "charts/goals fixtures must cross the authenticated loopback boundary");
  requireCondition(source.page.includes("fetchOwnedReadingAnalyticsData") && source.page.includes("getConsumerSignInRedirectPath") && source.page.includes("ReadingAnalyticsRequestSchema"), "stats page must keep auth and request validation explicit");
  requireCondition(source.client.includes("stats-goal-dialog") && source.client.includes("stats-share-card") && source.client.includes("navigator.clipboard") && source.client.includes("link.download"), "stats client must expose goal dialog and share fallbacks");
  requireCondition(source.api.includes('eq("user_id", user.id)') && source.api.includes("reading_goals") && source.api.includes("ReadingGoalUpdateRequestSchema"), "goal API must be owner-scoped and schema-validated");
  requireCondition(source.loading.includes('data-route-state="pending"') && source.error.includes('data-route-state="error"'), "stats route states must include loading and error surfaces");
  requireCondition(source.ko.includes('"stats"') && source.en.includes('"stats"') && source.ko.includes('"stale"') && source.en.includes('"stale"'), "stats copy must be localized in Korean and English");
  requireCondition(source.e2e.includes("reading statistics metrics") && source.e2e.includes("annual goal updates") && source.e2e.includes("stats share fallback"), "happy browser scenarios must be named");
  requireCondition(source.e2e.includes("statistics empty state") && source.e2e.includes("statistics invalid-range") && source.e2e.includes("statistics stale snapshot"), "failure browser scenarios must be named");
  requireCondition(source.e2e.includes("task-27-bookgolas-web-app-parity.png"), "browser suite must capture issue evidence");

  if (fixtureMode === "timezone") {
    requireCondition(fixture.fixtures.some((item) => item.name === "timezone-boundary" && item.expected.beforeUtcBoundary === "2026-09-01" && item.expected.atUtcBoundary === "2026-09-02"), "timezone fixture must assert both KST boundary days");
    requireCondition(source.sourceTest.includes("14:59:59.000Z") && source.sourceTest.includes("15:00:00.000Z"), "timezone test must assert both sides of the UTC boundary");
  }
  if (fixtureMode === "foreign") requireCondition(source.fixtureTest.includes("Foreign Private title") && source.fixtureTest.includes("foreign"), "foreign fixture must assert private title absence");
  if (fixtureMode === "deleted") requireCondition(source.fixtureTest.includes("Deleted Private title") && source.fixtureTest.includes("deleted"), "deleted fixture must assert deleted title absence");
  if (fixtureMode === "unauthorized") requireCondition(source.fixtureSource.includes("unauthorizedError") && source.page.includes("getConsumerSignInRedirectPath"), "unauthorized fixture must use shared sign-in boundary");
  if (fixtureMode === "invalid-range") requireCondition(source.source.includes("customStart > request.customEnd") && source.client.includes("customStart > customEnd"), "invalid range must be rejected at contract and browser boundaries");
  if (fixtureMode === "stale") requireCondition(source.fixtureSource.includes('freshness: input.fixture === "charts-goals-stale" ? "stale"') && source.client.includes("stats-stale"), "stale fixture must label the last available snapshot");
}

if (failures.length > 0) {
  console.error(`charts/goals contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`charts/goals contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
