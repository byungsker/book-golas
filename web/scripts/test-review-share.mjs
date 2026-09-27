import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/review-share-contract.json"),
  fixture: path.join(root, "scripts/fixtures/review-share-negative.json"),
  package: path.join(root, "package.json"),
  schema: path.join(root, "src/lib/product/contracts/review-share.ts"),
  schemaTest: path.join(root, "src/lib/product/contracts/review-share.test.ts"),
  operations: path.join(root, "src/lib/product/contracts/operations.ts"),
  adapter: path.join(root, "src/lib/product/adapters/functions-adapters.ts"),
  dal: path.join(root, "src/lib/product/dal/writes.ts"),
  route: path.join(root, "src/app/api/consumer/review-share/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/review-share/route.test.ts"),
  page: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/review/page.tsx"),
  client: path.join(root, "src/components/consumer/book-review-client.tsx"),
  fixtureSource: path.join(root, "src/lib/consumer/review-share-fixtures.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
  e2e: path.join(root, "tests/e2e/review-share.spec.ts"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing review-share ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty review-share ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 437 && contract.task === 25, "review-share contract must bind issue 437 task 25");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "review-share contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "review-share must cover Korean and English");
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 4, "review-share parity rows must map native surfaces to Web dispositions");
  for (const row of contract.parityRows ?? []) {
    requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && Array.isArray(row.nativeStates), "each review parity row must declare native surface, actions and states");
    requireCondition(typeof row.browserDisposition === "string", "each review parity row must declare a browser disposition");
  }
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "timeout", "provider"]) requireCondition(contract.states.includes(state), `review-share contract must cover ${state}`);
  for (const invariant of ["draft_is_local_and_scoped_to_book", "failed_generation_preserves_unsaved_text", "ai_generation_requires_explicit_consent", "review_save_is_owner_scoped", "canonical_url_is_localized_and_stable", "web_share_uses_clipboard_then_download_fallback", "native_share_sheet_is_not_promised", "billing_ctas_are_not_enabled"]) requireCondition(contract.invariants.includes(invariant), `missing review-share invariant ${invariant}`);
  requireCondition(fixture.issue === 437 && fixture.fixtures.length >= 8, "review-share negative fixtures must cover policy, provider, transport and ownership boundaries");
  requireCondition(packageJson.scripts["test:review-share"] === "node scripts/test-review-share.mjs && vitest run src/lib/product/contracts/review-share.test.ts src/app/api/consumer/review-share/route.test.ts src/lib/product/adapters.test.ts src/lib/product/dal.writes.test.ts", "package must expose the exact review-share acceptance command");
  requireCondition(packageJson.scripts["test:review-share:negative"].includes("--fixture consent") && packageJson.scripts["test:review-share:negative"].includes("--fixture clipboard"), "package must expose review-share negative fixtures");

  requireCondition(source.schema.includes("ReviewMutationSchema") && source.schema.includes("ReviewSaveRequestSchema") && source.schema.includes("ReviewGenerateRequestSchema"), "schema must model save and AI generation mutations");
  requireCondition(source.schema.includes("RequestIdSchema") && source.schema.includes("ReviewLinkSchema") && source.schema.includes("ReviewEditorStateSchema"), "schema must model idempotency, HTTPS links and editor states");
  requireCondition(source.operations.includes("longReview") && source.operations.includes("reviewLink") && source.operations.includes("rating"), "book update contract must persist all review fields");
  requireCondition(source.dal.includes("updates.long_review") && source.dal.includes("updates.review_link") && source.dal.includes("updates.rating"), "owner DAL must persist all review fields");
  requireCondition(source.adapter.includes('"generate-book-review"') && source.adapter.includes("generateBookReview"), "AI generation must use the consent-aware function adapter");
  requireCondition(source.route.includes("ReviewMutationSchema") && source.route.includes("generateBookReview") && source.route.includes("updateBook") && source.route.includes("private, no-store"), "review API must validate typed mutations, use product operations and remain private");
  requireCondition(source.route.includes("Ownership is derived from the authenticated session") && source.route.includes("revalidatePath"), "review API must reject caller identity and invalidate private views");
  requireCondition(source.page.includes("fetchOwnedBookDetail") && source.page.includes("review"), "review route must verify ownership before rendering the editor");
  requireCondition(source.client.includes("localStorage") && source.client.includes("navigator.share") && source.client.includes("navigator.clipboard") && source.client.includes("download") && source.client.includes("canonicalUrl"), "client must implement local drafts and share fallbacks");
  requireCondition(source.client.includes("aiConsent") && source.client.includes("review-ai-generate") && source.client.includes("review-ai-draft") && source.client.includes("setLongReview(generatedDraft)"), "client must expose consent, AI draft and draft recovery");
  requireCondition(source.fixtureSource.includes("review-share-provider") && source.fixtureSource.includes("review-share-timeout") && source.fixtureSource.includes("mutations"), "fixtures must cover provider, timeout and idempotent saves");
  requireCondition(source.routeFixture.includes('"review-share-happy"') && source.proxy.includes('startsWith("review-share-")'), "fixtures must stay behind the authenticated loopback boundary");
  requireCondition(source.ko.includes('"reviewEditor"') && source.en.includes('"reviewEditor"'), "review copy must be localized");
  requireCondition(source.e2e.includes("save, draft and share") && source.e2e.includes("consent") && source.e2e.includes("provider") && source.e2e.includes("clipboard"), "browser suite must name issue-defined scenarios");

  if (fixtureMode) {
    requireCondition(fixture.fixtures.some((entry) => entry.name === fixtureMode), `missing review-share fixture ${fixtureMode}`);
    if (fixtureMode === "consent") requireCondition(source.client.includes('setAiState("consent")') && source.route.includes("consentRequiredError"), "consent fixture must fail closed in the client and API");
    if (fixtureMode === "provider") requireCondition(source.fixtureSource.includes("providerError") && source.client.includes('"provider_error"'), "provider fixture must preserve the typed provider failure");
    if (fixtureMode === "timeout") requireCondition(source.fixtureSource.includes("timeoutError") && source.client.includes('"timeout"'), "timeout fixture must preserve the typed timeout");
    if (fixtureMode === "clipboard") requireCondition(source.client.includes("copyWithLegacyFallback") && source.client.includes("downloadCard"), "clipboard fixture must reach the download fallback");
    if (fixtureMode === "foreign") requireCondition(source.fixtureSource.includes("notFoundError") && source.route.includes("getBook"), "foreign fixture must fail closed through owner-scoped reads");
    if (fixtureMode === "empty") requireCondition(source.fixtureSource.includes('draft: ""') && source.client.includes('aiState === "empty"'), "empty fixture must render the empty AI state");
    if (fixtureMode === "quota") requireCondition(source.fixtureSource.includes("quotaExceededError") && source.client.includes('"quota"'), "quota fixture must preserve the quota state");
    if (fixtureMode === "offline") requireCondition(source.fixtureSource.includes("offlineError") && source.client.includes('"offline"'), "offline fixture must preserve local text");
  }
}

if (failures.length > 0) {
  console.error(`review-share contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`review-share contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
