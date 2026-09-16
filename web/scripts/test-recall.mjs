import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/recall-contract.json"),
  fixture: path.join(root, "scripts/fixtures/recall-negative.json"),
  package: path.join(root, "package.json"),
  contractSource: path.join(root, "src/lib/product/contracts/recall.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/recall-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/recall-fixtures.test.ts"),
  tableTest: path.join(root, "src/lib/product/adapters.tables.test.ts"),
  tables: path.join(root, "src/lib/product/adapters/tables.ts"),
  dal: path.join(root, "src/lib/product/dal/consumer-images.ts"),
  route: path.join(root, "src/app/api/consumer/recall/route.ts"),
  sourceRoute: path.join(root, "src/app/api/consumer/recall/source/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/recall/route.test.ts"),
  component: path.join(root, "src/components/consumer/recall-client.tsx"),
  library: path.join(root, "src/components/consumer/library-client.tsx"),
  detail: path.join(root, "src/components/consumer/book-detail-client.tsx"),
  fixtureRegistry: path.join(root, "src/lib/consumer/route-fixture.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
  e2e: path.join(root, "tests/e2e/recall.spec.ts"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing Recall ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty Recall ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 441 && contract.task === 29 && contract.parentIssue === 412, "Recall contract must bind issue 441/task 29/parent 412");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "Recall contract must reference the parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "Recall contract must target Web 1.1.0");
  requireCondition(contract.locales?.join(",") === "ko,en", "Recall contract must cover ko and en");
  requireCondition(JSON.stringify(contract.scopes) === JSON.stringify(["global", "book"]), "Recall contract must cover global and book scope");
  for (const state of ["idle", "loading", "empty", "unauthorized", "consent_required", "quota_exceeded", "provider_error", "offline", "error"]) requireCondition(contract.states?.includes(state), `Recall state missing: ${state}`);
  for (const operation of ["global_search", "book_search", "recent_queries", "suggestions_keywords", "answer_card", "grouped_sources", "expand_collapse", "copy", "record_detail", "private_image_view", "delete_history", "go_to_owned_book"]) requireCondition(contract.operations?.some((entry) => entry.native === operation), `Recall operation missing: ${operation}`);
  for (const reference of ["global_recall_search_sheet.dart", "recall_search_sheet.dart", "record_detail_sheet.dart", "source_detail_modal.dart", "recall_service.dart", "recall-search/index.ts"]) requireCondition(contract.nativeReferences?.some((entry) => entry.includes(reference)), `native reference missing: ${reference}`);
  requireCondition(fixture.issue === 441 && fixture.task === 29 && fixture.forbiddenMarkers.length >= 5, "Recall negative fixture metadata is incomplete");
  requireCondition(new Set(fixture.fixtures?.map((item) => item.name)).size === fixture.fixtures?.length, "Recall fixture names must be unique");

  const expectedTest = "node scripts/test-recall.mjs && vitest run src/lib/product/contracts/recall.test.ts src/lib/consumer/recall-fixtures.test.ts src/app/api/consumer/recall/route.test.ts src/lib/product/adapters.tables.test.ts src/lib/product/dal.consumer-images.test.ts";
  const expectedNegative = "node scripts/test-recall.mjs --fixture unauthorized && node scripts/test-recall.mjs --fixture consent && node scripts/test-recall.mjs --fixture quota && node scripts/test-recall.mjs --fixture provider && node scripts/test-recall.mjs --fixture offline && node scripts/test-recall.mjs --fixture empty && node scripts/test-recall.mjs --fixture foreign && node scripts/test-recall.mjs --fixture signed-image";
  requireCondition(packageJson.scripts?.["test:recall"] === expectedTest, "package must expose the exact Recall acceptance command");
  requireCondition(packageJson.scripts?.["test:recall:negative"] === expectedNegative, "package must expose the exact Recall negative command");

  requireCondition(source.contractSource.includes("RecallHistoryPageSchema") && source.contractSource.includes("RecallSearchApiRequestSchema") && source.contractSource.includes(".strict()"), "Recall contracts must be strict and typed");
  requireCondition(source.route.includes("listGlobalRecallHistory") && source.route.includes("listBookRecallHistory") && source.route.includes("searchRecall") && source.route.includes("deleteRecallHistory"), "Recall route must use typed owner-scoped adapters");
  requireCondition(source.route.includes("Ownership is derived") && source.route.includes("user_id") && !source.route.includes("user_id:"), "Recall route must reject caller identity without accepting it");
  requireCondition(source.tables.includes('.eq("user_id", session.value.userId)') && source.tables.includes('.eq("book_id", parsedBookId.data)') && source.tables.includes("deleteRecallHistory"), "Recall history adapter must bind reads/deletes to the verified owner");
  requireCondition(source.dal.includes("getOwnedBookImageWithSignedUrl") && source.dal.includes("fetchOwnedImage") && source.dal.includes("getBookImageUrl"), "Recall source images must use owner checks and signed URLs");
  requireCondition(source.sourceRoute.includes("getOwnedBookImageWithSignedUrl") && source.sourceRoute.includes("signedUrl") && source.sourceRoute.includes("sourceId"), "source detail route must return a signed image contract");
  requireCondition(source.component.includes("RecallHistoryPageSchema") && source.component.includes("RecallSearchResponseSchema") && source.component.includes("RecallDeleteHistoryResponseSchema"), "Recall UI must parse typed responses");
  for (const marker of ["recall-loading", "recall-consent", "recall-quota", "recall-provider", "recall-offline", "recall-source-group-toggle", "recall-source-detail", "recall-source-copy", "recall-source-go-to-book"]) requireCondition(source.component.includes(marker), `Recall UI must expose ${marker}`);
  requireCondition(source.component.includes('testPrefix}-empty') && source.component.includes('testPrefix}-history-delete'), "Recall UI must expose scoped empty and history deletion states");
  requireCondition(source.component.includes("clipboard") && source.component.includes("signedUrl") && source.component.includes("photo_ocr"), "Recall UI must support copy and private image detail");
  requireCondition(source.library.includes("RecallClient") && source.detail.includes("RecallClient"), "global library and per-book detail must mount Recall");
  requireCondition(source.fixtureRegistry.includes('"recall-happy"') && source.proxy.includes('startsWith("recall-")') && source.queries.includes('startsWith("recall-")'), "Recall fixtures must cross authenticated loopback boundaries");
  requireCondition(source.en.includes('"recall"') && source.ko.includes('"recall"'), "Recall copy must exist in Korean and English");
  requireCondition(source.fixtureSource.includes("Foreign private title") && source.fixtureSource.includes("recall-foreign"), "negative fixture source must include foreign boundary markers");
  requireCondition(source.fixtureTest.includes("foreign") && source.routeTest.includes("user_id") && source.tableTest.includes("delete"), "Recall tests must cover privacy and idempotent deletion");
  requireCondition(source.e2e.includes("global") && source.e2e.includes("book") && source.e2e.includes("source") && source.e2e.includes("history") && source.e2e.includes("consent") && source.e2e.includes("quota") && source.e2e.includes("foreign") && source.e2e.includes("empty"), "Recall browser suite must cover happy and failure scenarios");
  requireCondition(source.e2e.includes("task-29-bookgolas-web-app-parity.png"), "Recall browser suite must capture issue evidence");

  const fixtureNames = fixture.fixtures?.map((item) => item.name) ?? [];
  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown Recall negative fixture: ${fixtureMode}`);
    if (selected) {
      requireCondition(source.fixtureSource.includes(selected.routeFixture), `fixture source must include ${selected.routeFixture}`);
      requireCondition(source.e2e.includes(selected.routeFixture), `browser suite must exercise ${selected.routeFixture}`);
      if (selected.expected.code) requireCondition(source.fixtureSource.includes(`"${selected.expected.code}"`) || source.routeTest.includes(`"${selected.expected.code}"`), `${fixtureMode} must preserve ${selected.expected.code}`);
      requireCondition(fixtureNames.includes(fixtureMode), `fixture metadata must include ${fixtureMode}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Recall contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Recall contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
