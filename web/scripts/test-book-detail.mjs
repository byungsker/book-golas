import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/book-detail-contract.json"),
  fixture: path.join(root, "scripts/fixtures/book-detail-negative.json"),
  manifest: path.join(root, "package.json"),
  page: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/page.tsx"),
  client: path.join(root, "src/components/consumer/book-detail-client.tsx"),
  api: path.join(root, "src/app/api/consumer/book-detail/route.ts"),
  apiTest: path.join(root, "src/app/api/consumer/book-detail/route.test.ts"),
  fixtures: path.join(root, "src/lib/consumer/book-detail-fixtures.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  contractSource: path.join(root, "src/lib/product/contracts/book-detail.ts"),
  contractTest: path.join(root, "src/lib/product/contracts/book-detail.test.ts"),
  operations: path.join(root, "src/lib/product/contracts/operations.ts"),
  dal: path.join(root, "src/lib/product/dal/writes.ts"),
  e2e: path.join(root, "tests/e2e/book-detail.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing book-detail ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) {
    requireCondition(fs.statSync(filePath).size > 0, `empty book-detail ${name}: ${path.relative(root, filePath)}`);
  }
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(
    Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]),
  );
  const expectedActions = ["start", "resume", "pause", "complete", "delete"];
  const expectedStatuses = ["planned", "reading", "completed", "will_retry"];
  const expectedStates = [
    "loading",
    "ready",
    "empty",
    "error",
    "unauthorized",
    "consent",
    "quota",
    "offline",
    "not-found",
    "foreign",
    "deleted",
    "invalid-transition",
    "updated",
    "delete-confirmation",
    "retry",
  ];

  requireCondition(contract.issue === 433, "book-detail contract must bind issue 433");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "book-detail contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.native.actions) === JSON.stringify(expectedActions), "book-detail actions must match the native action set");
  requireCondition(JSON.stringify(contract.native.statuses) === JSON.stringify(expectedStatuses), "book-detail statuses must match the native status set");
  requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "book-detail must cover Korean and English");
  for (const state of expectedStates) requireCondition(contract.states.includes(state), `book-detail contract must cover ${state}`);
  for (const [status, actions] of Object.entries(contract.statusActions)) {
    requireCondition(actions.includes("delete"), `${status} must expose the guarded delete action`);
  }
  for (const cachePath of contract.cacheInvalidation) {
    requireCondition(cachePath.startsWith("/{locale}/"), `cache invalidation path must stay localized: ${cachePath}`);
  }
  requireCondition(Array.isArray(contract.nativeOnly) && contract.nativeOnly.length >= 6, "native-only detail capabilities must be explicit");
  requireCondition(Array.isArray(fixture.fixtures) && fixture.issue === 433 && fixture.fixtures.length >= 4, "book-detail negative fixtures must cover ownership, deletion, transitions and confirmation");
  requireCondition(manifest.scripts["test:book-detail"] === "node scripts/test-book-detail.mjs && vitest run src/lib/product/contracts/book-detail.test.ts src/app/api/consumer/book-detail/route.test.ts src/lib/product/dal.writes.test.ts", "package must expose the exact book-detail acceptance command");
  requireCondition(manifest.scripts["test:book-detail:negative"] === "node scripts/test-book-detail.mjs --fixture foreign-book", "package must expose the book-detail negative command");

  requireCondition(source.page.includes("fetchOwnedBookDetail") && source.page.includes("BookDetailClient"), "book detail route must load the full owner-scoped book and render actions");
  requireCondition(source.page.includes('data-testid="book-detail"') && source.page.includes("data-book-status"), "book detail route must expose a stable status surface");
  for (const marker of [
    "book-detail-actions",
    "book-detail-action-start",
    "book-detail-action-resume",
    "book-detail-action-pause",
    "book-detail-action-complete",
    "book-detail-action-delete",
    "book-detail-updated",
    "book-detail-action-error",
    "book-detail-retry",
    "book-detail-delete-dialog",
    "book-detail-delete-cancel",
    "book-detail-delete-confirm",
    "book-detail-attempt",
    "book-detail-metadata",
  ]) requireCondition(source.client.includes(marker), `book detail client must expose ${marker}`);
  requireCondition(source.client.includes("BookDetailResponseSchema") && source.client.includes("canApplyBookDetailAction"), "book detail client must parse typed responses and use the native action matrix");
  requireCondition(source.client.includes("/api/consumer/book-detail") && source.client.includes("cache: \"no-store\""), "book detail client must use the private action API");
  requireCondition(source.client.includes("disabled={pendingAction !== null}") && source.client.includes("Dialog"), "pending actions and delete confirmation must be guarded in the browser");
  requireCondition(source.client.includes("url.protocol === \"https:\""), "external detail links must be HTTPS-only");

  requireCondition(source.api.includes("BookDetailRequestSchema") && source.api.includes("getBook") && source.api.includes("updateBook") && source.api.includes("deleteBook"), "book detail API must use the strict request schema and canonical DAL");
  requireCondition(source.api.includes("canApplyBookDetailAction") && source.api.includes("revalidatePath"), "book detail API must enforce status transitions and invalidate dependent reads");
  requireCondition(source.api.includes("Cache-Control") && source.api.includes("private, no-store"), "book detail API must be private and uncached");
  requireCondition(source.api.includes("book-detail-") && source.routeFixture.includes('"book-detail-success"') && source.proxy.includes('startsWith("book-detail-")'), "detail fixtures must be loopback allowlisted across route and auth boundaries");
  requireCondition(source.fixtures.includes("book-detail-foreign") && source.fixtures.includes("book-detail-deleted") && source.fixtures.includes("canApplyBookDetailAction"), "detail fixtures must model foreign, deleted and invalid transition boundaries");
  requireCondition(source.queries.includes("bookDtoSelect") && source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)'), "detail reads must select the full DTO with owner and active-row scope");
  requireCondition(source.contractSource.includes("BookDetailRequestSchema") && source.contractSource.includes("actionsByStatus"), "detail contract source must own the action matrix");
  requireCondition(source.operations.includes("attemptCount") && source.operations.includes("pausedAt"), "book operation contract must carry lifecycle metadata");
  requireCondition(source.dal.includes("paused_at") && source.dal.includes("attempt_count") && source.dal.includes('.eq("user_id", session.value.userId)'), "book DAL must persist pause/attempt metadata under verified owner scope");
  requireCondition(source.ko.includes('"bookDetail"') && source.en.includes('"bookDetail"'), "book detail copy must be localized in Korean and English");
  requireCondition(source.e2e.includes('detail exposes metadata and completes before a confirmed delete') && source.e2e.includes('foreign, deleted and invalid-transition detail requests fail closed'), "E2E must name the issue-defined happy and failure scenarios");
  requireCondition(source.e2e.includes("task-20-bookgolas-web-app-parity.png") && source.e2e.includes("book-detail-delete-cancel") && source.e2e.includes("book-detail-delete-confirm"), "E2E must capture evidence and exercise confirmation boundaries");

  if (fixtureMode === "foreign-book") {
    requireCondition(source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)'), "foreign-book negative fixture must retain owner and active-row scope");
    requireCondition(source.e2e.includes("book-detail-foreign") && source.e2e.includes("not-found-or-forbidden"), "foreign-book negative fixture must be exercised as a safe not-found");
  }
  if (fixtureMode === "deleted-book") {
    requireCondition(source.fixtures.includes("book-detail-deleted") && source.queries.includes('.is("deleted_at", null)'), "deleted-book negative fixture must hide soft-deleted rows");
    requireCondition(source.e2e.includes("book-detail-deleted"), "deleted-book negative fixture must be exercised by the browser");
  }
  if (fixtureMode === "invalid-transition") {
    requireCondition(source.contractTest.includes("completed") && source.contractTest.includes("will_retry"), "invalid-transition fixture must have executable status coverage");
    requireCondition(source.api.includes("This book action is not available for its current status") && source.fixtures.includes("validationError"), "invalid-transition fixture must fail with a typed validation error");
    requireCondition(source.e2e.includes("invalid-transition") && source.e2e.includes("validation_error"), "invalid-transition fixture must be exercised through the API");
  }
  if (fixtureMode === "delete-without-confirmation") {
    requireCondition(source.client.includes("book-detail-delete-dialog") && source.client.includes("book-detail-delete-cancel") && source.client.includes("book-detail-delete-confirm"), "delete fixture must require an explicit confirmation dialog");
    requireCondition(source.e2e.includes("still visible") || source.e2e.includes("delete-cancel"), "delete fixture must verify cancellation preserves the detail");
  }
}

if (failures.length > 0) {
  console.error(`book-detail contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`book-detail contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
