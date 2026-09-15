import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/library-contract.json"),
  fixture: path.join(root, "scripts/fixtures/library-negative.json"),
  manifest: path.join(root, "package.json"),
  page: path.join(root, "src/app/[locale]/(consumer)/library/page.tsx"),
  api: path.join(root, "src/app/api/consumer/library/route.ts"),
  component: path.join(root, "src/components/consumer/library-client.tsx"),
  library: path.join(root, "src/lib/consumer/library.ts"),
  fixtures: path.join(root, "src/lib/consumer/library-fixtures.ts"),
  records: path.join(root, "src/lib/product/dal/records.ts"),
  tables: path.join(root, "src/lib/product/adapters/tables.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  e2e: path.join(root, "tests/e2e/library.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};
const failures = [];
const requireCondition = (condition, message) => { if (!condition) failures.push(message); };

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing library ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty library ${name}: ${path.relative(root, filePath)}`);
}

const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

requireCondition(contract.issue === 430, "library contract must bind issue 430");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "library contract must reference the parity plan");
requireCondition(JSON.stringify(contract.native.tabs) === JSON.stringify(["reading", "review", "records"]), "native library tabs must stay in reading/review/records order");
requireCondition(JSON.stringify(contract.web.tabs) === JSON.stringify(["reading", "review", "records"]), "web library tabs must stay in reading/review/records order");
for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline"]) requireCondition(contract.states.includes(state), `library contract must cover ${state}`);
requireCondition(contract.web.pagination.kind === "server-cursor" && contract.web.pagination.deduplicateBy === "id", "library pagination must be server cursor based and id deduplicated");
requireCondition(contract.web.recall.entry === "global" && contract.web.recall.historyScope === "book_id IS NULL" && contract.web.recall.resultIsBookList === false, "Recall must be global, owner scoped and separate from books");
requireCondition(contract.dataPolicy.ownerScoped && contract.dataPolicy.callerIdentityRejected && contract.dataPolicy.softDeletedExcluded && contract.dataPolicy.recallHistoryOwnerScoped, "library contract must state privacy policies");
requireCondition(manifest.scripts["test:library"] === "node scripts/test-library.mjs && vitest run src/lib/consumer/library.test.ts src/lib/product/adapters.tables.test.ts src/lib/product/dal.test.ts src/lib/product/dal.records.test.ts", "package must expose the exact library acceptance command");
requireCondition(manifest.scripts["test:library:negative"] === "node scripts/test-library.mjs --fixture foreign-private-data", "package must expose the library negative command");
requireCondition(source.page.includes("LibraryClient") && source.page.includes("initialRecall"), "library page must expose the client parity surface and Recall entry state");
requireCondition(source.api.includes("user_id") && source.api.includes("Ownership is derived") && source.api.includes("listGlobalRecallHistory"), "library API must reject caller identity and scope Recall history");
requireCondition(source.api.includes("listOwnedReadingRecords") && source.api.includes("reviewOnly") && source.api.includes("Cache-Control"), "library API must use owner-scoped books/records and private caching");
requireCondition(source.component.includes("AbortController") && source.component.includes("requestSequence") && source.component.includes("mergeById"), "library client must cancel stale requests and deduplicate pages");
requireCondition(source.component.includes("data-testid={`library-tab-${tab}`}") && source.component.includes('role="tab"'), "library tabs must be machine-checkable");
for (const marker of ["library-loading", "library-empty", "library-error", "library-unauthorized", "library-consent", "library-quota", "library-recall-panel"]) requireCondition(source.component.includes(marker), `library component must expose ${marker}`);
requireCondition(source.records.includes('.from("reading_content_embeddings")') && source.records.includes('.eq("user_id", session.value.userId)') && source.records.includes("created_at") && source.records.includes("id"), "reading records must use owner scope and stable cursor ordering");
requireCondition(source.tables.includes('.eq("user_id", session.value.userId)') && source.tables.includes('.is("book_id", null)'), "global Recall history must be owner scoped and book-less");
requireCondition(source.library.includes("groupRecordsByBook") && source.library.includes("mergeById") && source.library.includes("AbortError"), "library client helpers must preserve group and cancellation invariants");
requireCondition(source.routeFixture.includes('"library-book-list"') && source.proxy.includes('startsWith("library-")'), "library fixtures must be loopback allowlisted at auth boundaries");
requireCondition(source.ko.includes('"library"') && source.en.includes('"library"'), "both Korean and English library messages must be present");
requireCondition(source.e2e.includes("debounce") && source.e2e.includes("cancellation") && source.e2e.includes("foreign") && source.e2e.includes("Recall"), "browser coverage must name debounce, cancellation, privacy and Recall cases");
requireCondition(fixture.issue === 430 && fixture.forbiddenMarkers.length >= 3, "library negative fixture must bind issue 430 and include privacy markers");

if (fixtureMode === "foreign-private-data") {
  for (const marker of fixture.forbiddenMarkers) requireCondition(!source.page.includes(marker) && !source.component.includes(marker), `production library surface contains forbidden fixture marker: ${marker}`);
  for (const guard of fixture.requiredGuards) requireCondition(Object.values(source).some((value) => value.includes(guard)), `library privacy/cancellation guard is missing: ${guard}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(fixtureMode === "foreign-private-data"
  ? `library negative fixture passed: ${fixture.forbiddenMarkers.length} private markers stay out of the production surface`
  : "library contract passed: tabs, debounced search, cursor pagination, Recall boundary and state coverage");
