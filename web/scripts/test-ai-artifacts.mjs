import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/ai-artifacts-contract.json"),
  fixture: path.join(root, "scripts/fixtures/ai-artifacts-negative.json"),
  package: path.join(root, "package.json"),
  schema: path.join(root, "src/lib/product/contracts/ai-artifacts.ts"),
  schemaTest: path.join(root, "src/lib/product/contracts/ai-artifacts.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/ai-artifacts-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/ai-artifacts-fixtures.test.ts"),
  dal: path.join(root, "src/lib/product/dal/ai-artifacts.ts"),
  dalTest: path.join(root, "src/lib/product/dal.ai-artifacts.test.ts"),
  route: path.join(root, "src/app/api/consumer/ai-artifacts/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/ai-artifacts/route.test.ts"),
  component: path.join(root, "src/components/consumer/ai-artifacts-client.tsx"),
  mindmap: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/mind-map/page.tsx"),
  insights: path.join(root, "src/app/[locale]/(consumer)/reading-insights/page.tsx"),
  recommendations: path.join(root, "src/app/[locale]/(consumer)/book-list/page.tsx"),
  adapter: path.join(root, "src/lib/product/adapters/functions-adapters.ts"),
  edge: path.join(root, "../supabase/functions/reading-insights/index.ts"),
  edgeService: path.join(root, "../supabase/functions/reading-insights/services/insight-service.ts"),
  fixtureRegistry: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  pathsSource: path.join(root, "src/lib/consumer/paths.ts"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
  e2e: path.join(root, "tests/e2e/ai-artifacts.spec.ts")
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing AI artifact ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty AI artifact ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 442 && contract.task === 30 && contract.parentIssue === 412, "AI artifact contract must bind issue 442/task 30/parent 412");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "AI artifact contract must reference the parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "AI artifact contract must target Web 1.1.0");
  requireCondition(contract.locales?.join(",") === "ko,en", "AI artifacts must cover ko and en");
  for (const kind of ["mindmap", "insights", "recommendations"]) requireCondition(contract.artifacts?.includes(kind), `artifact kind missing: ${kind}`);
  for (const state of ["loading", "empty", "error", "unauthorized", "consent_required", "quota_exceeded", "offline", "missing", "expired", "rate_limit_exceeded", "provider_error"]) requireCondition(contract.states?.includes(state), `AI artifact state missing: ${state}`);
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length === 3, "AI artifact parity rows must cover all three artifacts");
  for (const row of contract.parityRows ?? []) requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && Array.isArray(row.nativeStates) && typeof row.webRoute === "string" && typeof row.webComponent === "string" && typeof row.browserDisposition === "string", "AI artifact parity rows must be machine-checkable");
  for (const feature of ["iOS widget", "Siri/App Shortcuts", "native push", "camera capture", "share sheet", "subscription and in-app purchase"]) requireCondition(contract.nativeOnly?.some((item) => item.feature === feature), `native-only feature missing: ${feature}`);
  requireCondition(fixture.issue === 442 && fixture.task === 30 && fixture.fixtures.length >= 10, "AI artifact negative fixtures are incomplete");
  requireCondition(new Set(fixture.fixtures?.map((item) => item.name)).size === fixture.fixtures?.length, "AI artifact fixture names must be unique");
  requireCondition(packageJson.scripts?.["test:ai-artifacts"] === "node scripts/test-ai-artifacts.mjs && vitest run src/lib/product/contracts/ai-artifacts.test.ts src/lib/consumer/ai-artifacts-fixtures.test.ts src/app/api/consumer/ai-artifacts/route.test.ts src/lib/product/dal.ai-artifacts.test.ts", "package must expose the exact AI artifact acceptance command");
  requireCondition(packageJson.scripts?.["test:ai-artifacts:negative"]?.includes("--fixture unauthorized") && packageJson.scripts?.["test:ai-artifacts:negative"]?.includes("--fixture foreign"), "package must expose AI artifact negative fixtures");
  requireCondition(source.schema.includes("AiArtifactGenerateRequestSchema") && source.schema.includes("AiArtifactReadResponseSchema") && source.schema.includes(".strict()") && source.schema.includes("RequestIdSchema"), "AI artifact contracts must be strict and idempotent");
  requireCondition(source.route.includes("readAiArtifact") && source.route.includes("structureNotes") && source.route.includes("generateReadingInsights") && source.route.includes("recommendNextBooks") && source.route.includes("withInFlight"), "AI artifact route must use typed owner adapters and request deduplication");
  requireCondition(source.route.includes("Ownership is derived from the authenticated session") && source.route.includes("user_id") && source.route.includes("private, no-store"), "AI artifact route must reject caller identity and stay private");
  requireCondition(source.dal.includes('.eq("user_id", session.value.userId)') && source.dal.includes("expires_at") && source.dal.includes("latestSourceUpdatedAt") && source.dal.includes("reading_insights_memory") && source.dal.includes("book_recommendations"), "AI artifact cache reader must be owner scoped, expiry aware and source aware");
  for (const marker of ["ai-artifacts-${kind}-loading", "ai-artifacts-${kind}-generating", "ai-artifacts-${kind}-empty", "ai-artifacts-${kind}-retry", "data-ai-operational-state", "consent_required", "quota_exceeded", "offline", "Dialog"]) requireCondition(source.component.includes(marker), `AI artifact UI must expose ${marker}`);
  requireCondition(source.adapter.includes("locale") && source.adapter.includes("reading-insights") && source.edge.includes("locale") && source.edgeService.includes("Write all titles and descriptions in English"), "insight locale must cross the Web and edge boundary");
  requireCondition(source.fixtureRegistry.includes('"ai-artifacts-happy"') && source.proxy.includes('startsWith("ai-artifacts-")') && source.queries.includes('startsWith("ai-artifacts-")'), "AI artifact fixtures must cross authenticated loopback boundaries");
  requireCondition(source.pathsSource.includes("reading-insights") && source.insights.includes("AiArtifactsClient") && source.recommendations.includes("AiArtifactsClient") && source.mindmap.includes("fetchOwnedBookDetail"), "all Web artifact routes must be protected and mounted");
  requireCondition(source.en.includes('"aiArtifacts"') && source.ko.includes('"aiArtifacts"'), "AI artifact copy must be localized");
  requireCondition(source.fixtureSource.includes("ai-artifacts-foreign") && source.fixtureSource.includes("notFoundError") && source.fixtureSource.includes("resetAiArtifactsFixtures"), "negative fixture source must preserve the owner boundary");
  requireCondition(source.fixtureTest.includes("replayed request key") && source.routeTest.includes("caller identity") && source.dalTest.includes("source change"), "AI artifact tests must cover idempotency, privacy and invalidation");
  requireCondition(source.e2e.includes("mindmap") && source.e2e.includes("reading insights") && source.e2e.includes("recommendation") && source.e2e.includes("expired") && source.e2e.includes("rate-limit") && source.e2e.includes("foreign") && source.e2e.includes("provider") && source.e2e.includes("task-30-bookgolas-web-app-parity.png"), "AI artifact browser suite must cover issue-defined scenarios and evidence");
  for (const marker of fixture.forbiddenMarkers ?? []) {
    requireCondition(!source.fixtureSource.includes(marker) || ["foreign-user-id", "User A", "service_role", "OPENAI_API_KEY", "purchase", "upgrade", "subscribe", "user_id:"].includes(marker), `fixture marker check is malformed: ${marker}`);
  }
  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown AI artifact negative fixture: ${fixtureMode}`);
    if (selected) {
      requireCondition(source.fixtureSource.includes(selected.routeFixture), `${fixtureMode} must exist in the fixture source`);
      requireCondition(source.e2e.includes(selected.routeFixture), `${fixtureMode} must be exercised by browser tests`);
      if (selected.expected.code) requireCondition(source.fixtureSource.includes(`"${selected.expected.code}"`) || source.routeTest.includes(`"${selected.expected.code}"`), `${fixtureMode} must preserve ${selected.expected.code}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`AI artifact contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AI artifact contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
