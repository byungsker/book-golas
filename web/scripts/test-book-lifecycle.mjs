import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/book-lifecycle-contract.json"),
  fixture: path.join(root, "scripts/fixtures/book-lifecycle-negative.json"),
  manifest: path.join(root, "package.json"),
  page: path.join(root, "src/app/[locale]/(consumer)/books/new/page.tsx"),
  client: path.join(root, "src/components/consumer/book-lifecycle-client.tsx"),
  discovery: path.join(root, "src/components/consumer/book-discovery-client.tsx"),
  api: path.join(root, "src/app/api/consumer/book-lifecycle/route.ts"),
  apiTest: path.join(root, "src/app/api/consumer/book-lifecycle/route.test.ts"),
  fixtures: path.join(root, "src/lib/consumer/book-lifecycle-fixtures.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  contracts: path.join(root, "src/lib/product/contracts/book-lifecycle.ts"),
  contractTest: path.join(root, "src/lib/product/contracts/book-lifecycle.test.ts"),
  operations: path.join(root, "src/lib/product/contracts/operations.ts"),
  books: path.join(root, "src/lib/product/contracts/books.ts"),
  dal: path.join(root, "src/lib/product/dal/writes.ts"),
  dalTest: path.join(root, "src/lib/product/dal.writes.test.ts"),
  e2e: path.join(root, "tests/e2e/book-lifecycle.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};
const failures = [];
const requireCondition = (condition, message) => { if (!condition) failures.push(message); };

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing book-lifecycle ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty book-lifecycle ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 431, "book-lifecycle contract must bind issue 431");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "book-lifecycle contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.native.priorityValues) === JSON.stringify([1, 2, 3, 4]), "native priority values must stay 1 through 4");
  requireCondition(JSON.stringify(contract.native.statuses) === JSON.stringify(["planned", "reading", "completed", "will_retry"]), "canonical statuses must stay stable");
  for (const state of ["loading", "ready", "invalid", "saved", "error", "retry", "duplicate", "unauthorized", "consent", "quota", "offline", "foreign"]) requireCondition(contract.states.includes(state), `lifecycle contract must cover ${state}`);
  for (const pathValue of contract.cacheInvalidation) requireCondition(pathValue.startsWith("/{locale}/"), `cache invalidation path must stay localized: ${pathValue}`);
  requireCondition(fixture.issue === 431 && fixture.fixtures.length >= 4, "book-lifecycle negative fixtures must cover pages, transitions, ownership and duplicate recovery");
  requireCondition(manifest.scripts["test:book-lifecycle"] === "node scripts/test-book-lifecycle.mjs && vitest run src/lib/product/contracts/book-lifecycle.test.ts src/lib/product/dal.writes.test.ts src/app/api/consumer/book-lifecycle/route.test.ts", "package must expose the exact book-lifecycle acceptance command");
  requireCondition(manifest.scripts["test:book-lifecycle:negative"] === "node scripts/test-book-lifecycle.mjs --fixture foreign-book-write", "package must expose the book-lifecycle negative command");
  requireCondition(source.page.includes("BookDiscoveryClient") && source.page.includes("ConsumerHeader"), "new-book route must keep the discovery entry");
  requireCondition(source.discovery.includes("BookLifecycleClient") && source.discovery.includes("selectedBook"), "selection must continue into lifecycle setup");
  requireCondition(source.client.includes("BookLifecycleResponseSchema") && source.client.includes("router.refresh"), "lifecycle client must parse saved records and refresh server lists");
  for (const marker of ["book-lifecycle-form", "book-lifecycle-schedule-preview", "book-lifecycle-schedule-edit", "book-lifecycle-status-", "book-lifecycle-priority-", "book-lifecycle-save", "book-lifecycle-saved", "book-lifecycle-retry"]) requireCondition(source.client.includes(marker), `lifecycle client must expose ${marker}`);
  requireCondition(source.client.includes("disabled={saveState === \"saving\"}") && source.client.includes("noValidate"), "duplicate submits must be visibly recoverable and client validation must run before native submit");
  requireCondition(source.api.includes("BookLifecycleRequestSchema") && source.api.includes("createBook") && source.api.includes("updateBook") && source.api.includes("revalidatePath"), "lifecycle API must use canonical DAL and invalidate relevant paths");
  requireCondition(source.api.includes("Cache-Control") && source.api.includes("book-lifecycle-"), "lifecycle API must be private and fixture bounded");
  requireCondition(source.contracts.includes("canTransitionBookStatus") && source.contracts.includes("statusTransitions") && source.contracts.includes("BookLifecycleRequestSchema"), "canonical lifecycle status contract is missing");
  requireCondition(source.operations.includes("plannedStartDate") && source.operations.includes("targetDate must be on or after"), "operation contracts must validate planned dates and date ranges");
  requireCondition(source.books.includes("bookPriorityValues") && source.books.includes("min(1).max(4)"), "priority contract must match the native 1..4 range");
  requireCondition(source.dal.includes("canTransitionBookStatus") && source.dal.includes("planned_start_date") && source.dal.includes("normalizeIsoDate") && source.dal.includes('.eq("user_id", session.value.userId)'), "DAL must normalize lifecycle fields, enforce transitions and owner scope");
  requireCondition(source.fixtures.includes("book-lifecycle-foreign") && source.routeFixture.includes('"book-lifecycle-success"') && source.proxy.includes('startsWith("book-lifecycle-")') && source.queries.includes("getBookLifecycleFixtureConsumerBook"), "lifecycle fixtures must stay on the loopback auth boundary and refresh home data");
  requireCondition(source.ko.includes('"bookLifecycle"') && source.en.includes('"bookLifecycle"'), "lifecycle copy must be localized in Korean and English");
  requireCondition(source.e2e.includes('grep') === false && source.e2e.includes("add") && source.e2e.includes("schedule") && source.e2e.includes("invalid") && source.e2e.includes("duplicate") && source.e2e.includes("foreign"), "browser coverage must name the issue-defined happy and failure scenarios");

  if (fixtureMode === "negative-pages-or-target") {
    requireCondition(source.operations.includes("totalPages: z.number().int().min(0)") && source.operations.includes("dailyTargetPages: z.number().int().min(1)"), "negative pages fixture must retain server-side bounds");
    requireCondition(source.client.includes("totalPagesNumber < 0") && source.client.includes("dailyTargetNumber") && source.client.includes("dateRange"), "negative pages fixture must retain client-side validation");
  }
  if (fixtureMode === "invalid-status-transition") {
    requireCondition(source.contractTest.includes("planned") && source.contractTest.includes("completed"), "invalid transition fixture must have executable transition coverage");
    requireCondition(source.dal.includes("status transition is not allowed"), "invalid transition fixture must be blocked by the DAL");
  }
  if (fixtureMode === "foreign-book-write") {
    requireCondition(source.dal.includes('.eq("id", parsedBookId.data)') && source.dal.includes('.eq("user_id", session.value.userId)'), "foreign update fixture must require both book and verified user scope");
    requireCondition(source.e2e.includes("foreignResponse.status()).toBe(404") && source.e2e.includes("book-lifecycle-foreign"), "foreign update fixture must be exercised through the browser API context");
  }
  if (fixtureMode === "duplicate-submit") {
    requireCondition(source.client.includes("disabled={saveState === \"saving\"}") && source.client.includes("book-lifecycle-retry"), "duplicate submit fixture must expose disabled pending state and retry");
  }
}

if (failures.length > 0) {
  console.error(`book-lifecycle contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`book-lifecycle contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
