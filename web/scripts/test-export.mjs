import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/export-contract.json"),
  fixture: path.join(root, "scripts/fixtures/export-negative.json"),
  package: path.join(root, "package.json"),
  function: path.join(root, "../supabase/functions/export-reading-data/index.ts"),
  functionContracts: path.join(root, "scripts/fixtures/function-contracts-cross-user.json"),
  schema: path.join(root, "src/lib/product/contracts/operations.ts"),
  schemaTest: path.join(root, "src/lib/product/contracts/export.test.ts"),
  adapter: path.join(root, "src/lib/product/adapters/functions-adapters.ts"),
  route: path.join(root, "src/app/api/consumer/export/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/export/route.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/export-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/export-fixtures.test.ts"),
  component: path.join(root, "src/components/consumer/reading-data-export-client.tsx"),
  accountPage: path.join(root, "src/app/[locale]/(consumer)/account/page.tsx"),
  fixtureRegistry: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
  matrix: path.join(root, "docs/consumer-parity-matrix.md"),
  e2e: path.join(root, "tests/e2e/export.spec.ts")
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing export ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty export ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const functionContracts = JSON.parse(fs.readFileSync(paths.functionContracts, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).filter(([name]) => !["contract", "fixture", "package", "functionContracts"].includes(name)).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));
  const exportFunctionContract = functionContracts.cases?.find((item) => item.name === "export-reading-data");

  requireCondition(contract.issue === 443 && contract.task === 33 && contract.parentIssue === 412, "export contract must bind issue 443/task 33/parent 412");
  requireCondition(contract.wave === 6 && contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "export contract must preserve the Wave 6 parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "export contract must target Web 1.1.0");
  requireCondition(contract.locales?.join(",") === "ko,en", "export must cover ko and en");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "ready", "delivery-retryable", "download-retryable"]) requireCondition(contract.states?.includes(state), `export state missing: ${state}`);
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 4, "export parity rows are incomplete");
  for (const row of contract.parityRows ?? []) requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && Array.isArray(row.nativeStates) && typeof row.webRoute === "string" && typeof row.webComponent === "string" && typeof row.browserDisposition === "string", "export parity rows must be machine-checkable");
  for (const feature of ["iOS widget", "Siri/App Shortcuts", "native push", "camera capture", "share sheet", "subscription and in-app purchase"]) requireCondition(contract.nativeOnly?.some((item) => item.feature === feature), `native-only feature missing: ${feature}`);
  for (const table of ["books", "reading_progress_history", "reading_sessions", "reading_content_embeddings", "book_images", "reading_goals", "recall_search_history", "note_structures", "reading_insights_memory", "book_recommendations", "ai_recall_usage"]) requireCondition(contract.sourceTables?.includes(table), `export source table missing: ${table}`);
  requireCondition(fixture.issue === 443 && fixture.task === 33 && fixture.parentIssue === 412 && fixture.fixtures.length >= 10, "export negative fixtures are incomplete");
  requireCondition(new Set(fixture.fixtures?.map((item) => item.name)).size === fixture.fixtures?.length, "export fixture names must be unique");
  requireCondition(exportFunctionContract?.valid?.status === 200 && exportFunctionContract?.crossUser?.status === 400, "generic function contract must preserve export valid and caller-identity rejection cases");
  requireCondition(packageJson.scripts?.["test:export"]?.includes("test-export.mjs") && packageJson.scripts?.["test:export"]?.includes("export.test.ts") && packageJson.scripts?.["test:export"]?.includes("route.test.ts"), "package must expose the export acceptance command");
  requireCondition(packageJson.scripts?.["test:export:negative"]?.includes("--fixture invalid-year") && packageJson.scripts?.["test:export:negative"]?.includes("--fixture email-mismatch") && packageJson.scripts?.["test:export:negative"]?.includes("--fixture delivery"), "package must expose export negative fixtures");
  requireCondition(source.schema.includes("ExportReadingDataRequestSchema") && source.schema.includes("ExportReadingDataResultSchema") && source.schema.includes("year") && source.schema.includes("email") && source.schema.includes(".strict()"), "export contracts must be strict and include year and email");
  requireCondition(source.function.includes("requireUser") && source.function.includes("user.email") && source.function.includes("requireInteger") && source.function.includes('from("books")') && source.function.includes('from("reading_progress_history")') && source.function.includes('from("reading_sessions")') && source.function.includes('from("reading_content_embeddings")') && source.function.includes('from("book_images")') && source.function.includes('from("reading_goals")') && source.function.includes('from("recall_search_history")') && source.function.includes('from("note_structures")') && source.function.includes('from("reading_insights_memory")') && source.function.includes('from("book_recommendations")') && source.function.includes('from("ai_recall_usage")'), "export function must read the current supported graph");
  requireCondition(source.function.includes('eq("user_id", user.id)') && source.function.includes("startOfYear") && source.function.includes("endOfYear") && source.function.includes("selectedBookIds"), "export function must filter every graph boundary by owner and selected year");
  for (const marker of fixture.forbiddenQueryMarkers ?? []) requireCondition(!source.function.includes(marker), `export query contains obsolete table marker ${marker}`);
  requireCondition(source.function.includes("requestedEmail") && source.function.includes("toLowerCase") && source.function.includes('"forbidden"') && source.function.includes("includeImages"), "export function must validate email ownership and image selection");
  requireCondition(source.function.includes("recordCount") && source.function.includes("bookCount") && source.function.includes('downloadUrl: null'), "export result must expose bounded counts without an unverified download URL");
  requireCondition(source.adapter.includes("resolveProductSession") && source.adapter.includes("ExportReadingDataRequestSchema") && source.adapter.includes("export-reading-data") && source.adapter.includes("forbiddenError"), "export adapter must use the verified session and email boundary");
  requireCondition(source.route.includes("ExportReadingDataRequestSchema") && source.route.includes("hasCallerIdentity") && source.route.includes("exportReadingData") && source.route.includes("private, no-store"), "export route must validate requests, ownership and private caching");
  requireCondition(source.fixtureSource.includes("export-empty") && source.fixtureSource.includes("consentRequiredError") && source.fixtureSource.includes("providerError") && source.fixtureSource.includes("quotaExceededError") && source.fixtureSource.includes("offlineError"), "export fixtures must cover empty, consent, quota, offline and provider failures");
  for (const marker of ["data-export-state", "data-export-locale", "export-loading", "export-empty", "export-error-state", "export-retry", "export-form", "export-year", "export-email", "export-format", "export-include-images", "export-submit", "export-success", "ConsumerLoadingState", "ConsumerEmptyState", "ConsumerErrorState"]) requireCondition(source.component.includes(marker), `export UI must expose ${marker}`);
  requireCondition(source.accountPage.includes("ReadingDataExportClient") && source.accountPage.includes("initialEmail"), "account page must expose the localized export action");
  requireCondition(source.fixtureRegistry.includes('"export-success"') && source.proxy.includes('startsWith("export-")') && source.queries.includes('startsWith("export-")'), "export fixtures must cross the authenticated loopback boundary");
  requireCondition(source.en.includes('"export"') && source.ko.includes('"export"'), "export copy must be localized");
  requireCondition(source.matrix.includes("#443") && source.matrix.includes("reading-data-export-client") && source.matrix.includes("memos") && source.matrix.includes("delivery unverified"), "parity matrix must record export ownership and native-only boundaries");
  requireCondition(source.e2e.includes("task-33-bookgolas-web-app-parity.png") && source.e2e.includes("invalid-year") && source.e2e.includes("mismatch") && source.e2e.includes("delivery") && source.e2e.includes("export-loading") && source.e2e.includes("export-empty"), "export browser suite must cover issue-defined lanes and evidence");
  for (const forbidden of fixture.forbiddenPublicMarkers ?? []) requireCondition(!source.e2e.includes(forbidden), `export browser fixture contains forbidden secret marker ${forbidden}`);
  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown export negative fixture: ${fixtureMode}`);
    if (selected) {
      requireCondition(source.fixtureSource.includes(selected.routeFixture), `${fixtureMode} must exist in the fixture source`);
      requireCondition(source.e2e.includes(selected.routeFixture) || source.e2e.includes(selected.name), `${fixtureMode} must be exercised by browser tests`);
      if (selected.expected.code) requireCondition(source.fixtureSource.includes(selected.expected.code.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())) || source.fixtureSource.includes(`"${selected.expected.code}"`) || source.route.includes(`"${selected.expected.code}"`), `${fixtureMode} must preserve ${selected.expected.code}`);
      if (selected.expected.retryable) requireCondition(source.fixtureSource.includes("providerError") && source.component.includes("retry"), `${fixtureMode} must preserve retryable semantics`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Export contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Export contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
