import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/consumer-progress-ui-contract.json"),
  fixture: path.join(root, "scripts/fixtures/progress-ui-negative.json"),
  manifest: path.join(root, "package.json"),
  action: path.join(root, "src/app/actions/reading-progress.ts"),
  actionTest: path.join(root, "src/app/actions/reading-progress.test.ts"),
  route: path.join(root, "src/app/api/consumer/progress/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/progress/route.test.ts"),
  client: path.join(root, "src/components/consumer/progress-updater.tsx"),
  detailPage: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/page.tsx"),
  readingPage: path.join(root, "src/app/[locale]/(consumer)/reading/[bookId]/page.tsx"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  fixtures: path.join(root, "src/lib/consumer/progress-fixtures.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  contractSource: path.join(root, "src/lib/product/contracts/progress-ui.ts"),
  contractTest: path.join(root, "src/lib/product/contracts/progress-ui.test.ts"),
  e2e: path.join(root, "tests/e2e/progress.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing progress-ui ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty progress-ui ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 434, "progress-ui contract must bind issue 434");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "progress-ui contract must reference the parity plan");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "conflict", "duplicate", "rollback", "completed", "will_retry"]) requireCondition(contract.states.includes(state), `progress-ui contract must cover ${state}`);
  for (const operation of ["forward_edit", "backward_edit", "complete_at_total_pages", "atomic_page_status_history", "idempotent_submit", "stale_refetch", "history_failure"]) requireCondition(contract.operations.includes(operation), `progress-ui contract must cover ${operation}`);
  requireCondition(fixture.issue === 434 && fixture.fixtures.length >= 6, "progress-ui negative fixtures must cover failure and ownership boundaries");
  requireCondition(manifest.scripts["test:progress-ui"] === "node scripts/test-progress-ui.mjs && vitest run src/lib/product/contracts/progress-ui.test.ts src/lib/consumer/progress-fixtures.test.ts src/app/api/consumer/progress/route.test.ts src/app/actions/reading-progress.test.ts", "package must expose the exact progress-ui acceptance command");
  requireCondition(manifest.scripts["test:progress-ui:negative"] === "node scripts/test-progress-ui.mjs --fixture stale && node scripts/test-progress-ui.mjs --fixture duplicate && node scripts/test-progress-ui.mjs --fixture server-error && node scripts/test-progress-ui.mjs --fixture page-bounds", "package must expose the progress-ui negative command");
  requireCondition(source.action.includes('"update_reading_progress"') && source.action.includes("history_recorded") && source.action.includes("history_unavailable"), "progress action must use the atomic RPC and reject missing forward history");
  requireCondition(source.route.includes("ProgressUiRequestSchema") && source.route.includes("fetchOwnedProgressHistory") && source.route.includes("revalidatePath"), "progress API must validate, read owner history and invalidate private paths");
  requireCondition(source.route.includes("progress-") && source.route.includes("Cache-Control") && source.route.includes("duplicate"), "progress API must keep fixtures loopback-only and return idempotency state");
  requireCondition(source.client.includes("ProgressUiResponseSchema") && source.client.includes("router.refresh") && source.client.includes("progress-history") && source.client.includes("progress-refetch"), "progress client must parse atomic responses, render history and offer refetch");
  requireCondition(source.client.includes("setBook((previous) => ({ ...previous, currentPage: request.currentPage }))") && source.client.includes("restore(rollback)"), "progress client must limit optimistic state and rollback failures");
  requireCondition(source.client.includes("disabled={isSubmitting || book.totalPages < 0}"), "progress client must disable concurrent submits");
  requireCondition(source.detailPage.includes("fetchOwnedProgressHistory") && source.detailPage.includes("initialHistory"), "detail page must render owner-scoped progress history");
  requireCondition(source.readingPage.includes("fetchOwnedProgressHistory") && source.readingPage.includes("initialHistory"), "reading page must share the progress history surface");
  requireCondition(source.queries.includes("fetchOwnedProgressHistory") && source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)'), "history query must enforce owner and active-book scope");
  requireCondition(source.fixtures.includes("progress-stale") && source.fixtures.includes("progress-duplicate") && source.fixtures.includes("historyUnavailableError"), "fixtures must model stale, idempotent and history-failure paths");
  requireCondition(source.routeFixture.includes("progress-server-error") && source.proxy.includes('startsWith("progress-")'), "progress fixtures must cross the existing authenticated loopback boundary");
  requireCondition(source.contractSource.includes("ProgressUiRequestSchema") && source.contractSource.includes("ProgressUiResponseSchema"), "progress-ui request and response schemas are required");
  requireCondition(source.contractTest.includes("readingTime") && source.contractTest.includes("idempotency") && source.contractTest.includes("history_unavailable"), "progress-ui contract tests must cover bounds and typed failure");
  requireCondition(source.ko.includes('"progressSummary"') && source.en.includes('"progressSummary"') && source.ko.includes('"historyEntry"') && source.en.includes('"historyEntry"'), "progress copy must be localized in Korean and English");
  requireCondition(source.e2e.includes("progress moves forward and keeps history") && source.e2e.includes("progress completes at total pages") && source.e2e.includes("progress renders retry attempt messaging"), "happy progress scenarios must be named in the browser suite");
  requireCondition(source.e2e.includes("stale progress shows conflict and refetch") && source.e2e.includes("duplicate submits preserve one history event") && source.e2e.includes("server-error never presents false success after history failure"), "failure progress scenarios must be named in the browser suite");
  requireCondition(source.e2e.includes("task-21-bookgolas-web-app-parity.png"), "progress browser suite must capture issue evidence");

  if (fixtureMode === "stale") {
    requireCondition(source.fixtures.includes("progress-stale") && source.client.includes('code === "conflict"') && source.client.includes("progress-refetch") && source.e2e.includes("progress-stale"), "stale fixture must preserve conflict and refetch behavior");
  }
  if (fixtureMode === "duplicate") {
    requireCondition(source.fixtures.includes("duplicateRequests") && source.routeTest.includes("duplicate") && source.e2e.includes("idempotencyKey"), "duplicate fixture must verify one event per idempotency key");
  }
  if (fixtureMode === "server-error") {
    requireCondition(source.fixtures.includes("historyUnavailableError") && source.client.includes("history_unavailable") && source.e2e.includes("progress-saved"), "server-error fixture must reject false success");
  }
  if (fixtureMode === "page-bounds") {
    requireCondition(source.contractSource.includes("currentPage: z.number().int().min(0)") && source.client.includes("nextPage > book.totalPages") && source.e2e.includes("total page"), "page-bounds fixture must retain server and client bounds");
  }
}

if (failures.length > 0) {
  console.error(`progress-ui contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`progress-ui contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
