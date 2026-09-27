import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/notes-highlights-contract.json"),
  fixture: path.join(root, "scripts/fixtures/notes-highlights-negative.json"),
  manifest: path.join(root, "package.json"),
  schema: path.join(root, "src/lib/product/contracts/notes-highlights.ts"),
  schemaTest: path.join(root, "src/lib/product/contracts/notes-highlights.test.ts"),
  dal: path.join(root, "src/lib/product/dal/consumer-records.ts"),
  dalTest: path.join(root, "src/lib/product/dal.consumer-records.test.ts"),
  route: path.join(root, "src/app/api/consumer/notes-highlights/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/notes-highlights/route.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/notes-highlights-fixtures.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  client: path.join(root, "src/components/consumer/notes-highlights-client.tsx"),
  detail: path.join(root, "src/components/consumer/book-detail-client.tsx"),
  e2e: path.join(root, "tests/e2e/notes-highlights.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
  migration: path.join(root, "../supabase/migrations/20260916120000_create_consumer_reading_records.sql"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing notes-highlights ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty notes-highlights ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 432 && contract.task === 23, "notes-highlights contract must bind issue 432 task 23");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "notes-highlights contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "notes-highlights must cover Korean and English");
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 4, "notes-highlights parity rows must map native surfaces to Web dispositions");
  for (const row of contract.parityRows ?? []) {
    requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && Array.isArray(row.nativeStates), "each parity row must declare native surface, actions and states");
    requireCondition(typeof row.browserDisposition === "string", "each parity row must declare a browser disposition");
  }
  for (const type of ["note", "highlight", "memorable_page"]) requireCondition(contract.native.recordTypes.includes(type), `record type ${type} is missing`);
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "pending", "failed", "retry", "duplicate", "foreign"]) requireCondition(contract.states.includes(state), `notes-highlights contract must cover ${state}`);
  for (const invariant of ["page_number_is_null_or_within_book_bounds", "rectangle_coordinates_are_normalized_0_to_1", "owner_record_is_saved_before_indexing", "failed_indexing_keeps_the_saved_record", "retry_is_idempotent", "ai_indexing_requires_explicit_consent", "foreign_records_are_not_found"]) requireCondition(contract.invariants.includes(invariant), `missing invariant ${invariant}`);
  requireCondition(fixture.issue === 432 && fixture.fixtures.length >= 9, "negative fixtures must cover validation, indexing, ownership and typed states");
  requireCondition(manifest.scripts["test:notes-highlights"] === "node scripts/test-notes-highlights.mjs && vitest run src/lib/product/contracts/notes-highlights.test.ts src/lib/product/dal.consumer-records.test.ts src/app/api/consumer/notes-highlights/route.test.ts", "package must expose the exact notes-highlights acceptance command");
  requireCondition(manifest.scripts["test:notes-highlights:negative"] === "node scripts/test-notes-highlights.mjs --fixture invalid-page && node scripts/test-notes-highlights.mjs --fixture invalid-rectangle && node scripts/test-notes-highlights.mjs --fixture index-failure && node scripts/test-notes-highlights.mjs --fixture foreign-record && node scripts/test-notes-highlights.mjs --fixture duplicate-retry", "package must expose the notes-highlights negative command");

  requireCondition(source.schema.includes("NormalizedHighlightRectangleSchema") && source.schema.includes("rectangle.x + rectangle.width") && source.schema.includes("normalizeHighlightRectangles"), "schema must enforce normalized rectangle bounds and round-trip normalization");
  requireCondition(source.schema.includes("recordType") && source.schema.includes("memorable_page") && source.schema.includes("aiConsent") && source.schema.includes("idempotencyKey"), "schema must model all record types, consent and idempotency");
  requireCondition(source.dal.includes('from("consumer_reading_records")') && source.dal.includes('.eq("user_id", session.userId)') && source.dal.includes('.eq("book_id", data.bookId)'), "DAL must persist records under verified owner and book scope");
  requireCondition(source.dal.includes("ownedBook") && source.dal.includes('.is("deleted_at", null)') && source.dal.includes("totalPages"), "DAL must verify an active owned book and page bounds");
  requireCondition(source.dal.includes("finishIndexing") && source.dal.includes("runIndex") && source.dal.includes("!aiConsent") && source.dal.includes("last_index_idempotency_key") && source.dal.includes('"failed"'), "indexing must be separate, consent-gated, idempotent and failure-preserving");
  requireCondition(source.route.includes("NotesHighlightsMutationSchema") && source.route.includes("listOwnedConsumerRecords") && source.route.includes("retryOwnedConsumerRecordIndex") && source.route.includes("private, no-store"), "API must validate typed mutations, use owner DAL and remain private");
  requireCondition(source.route.includes("Ownership is derived from the authenticated session") && source.route.includes("revalidatePath"), "API must reject caller identity and invalidate private views");
  requireCondition(source.fixtureSource.includes("notes-highlights-index-failure") && source.fixtureSource.includes("mutationsByKey") && source.fixtureSource.includes("retryKeys") && source.fixtureSource.includes("foreign"), "fixtures must cover index failure, idempotency and ownership");
  requireCondition(source.routeFixture.includes('"notes-highlights-happy"') && source.proxy.includes('startsWith("notes-highlights-")'), "fixtures must stay behind the authenticated loopback boundary");
  requireCondition(source.client.includes("notes-highlights-tabs") && source.client.includes("notes-highlights-dialog") && source.client.includes("notes-highlights-create-note") && source.client.includes("notes-highlights-create-highlight") && source.client.includes("notes-highlights-create-memorable-page"), "client must expose detail tabs and create modals");
  requireCondition(source.client.includes("notes-highlights-edit-") && source.client.includes("notes-highlights-delete-") && source.client.includes("notes-highlights-retry-") && source.client.includes("notes-highlights-index-status-"), "client must expose edit, delete, retry and index states");
  requireCondition(source.client.includes("totalPages") && source.client.includes("rectangle.x + rectangle.width > 1") && source.client.includes("aiConsent"), "client must retain page, rectangle and consent validation");
  requireCondition(source.detail.includes("NotesHighlightsClient"), "book detail must render the notes-highlights surface");
  requireCondition(source.migration.includes("consumer_reading_records") && source.migration.includes("ENABLE ROW LEVEL SECURITY") && source.migration.includes("auth.uid() = user_id"), "migration must persist owner-scoped records with RLS");
  requireCondition(source.ko.includes('"notesHighlights"') && source.en.includes('"notesHighlights"'), "notes-highlights copy must be localized");
  requireCondition(source.e2e.includes("create, edit and delete") && source.e2e.includes("invalid page and invalid rectangle") && source.e2e.includes("index-failure") && source.e2e.includes("foreign"), "browser suite must name the issue-defined happy and failure scenarios");

  if (fixtureMode === "invalid-page") {
    requireCondition(source.schema.includes("pageNumber") && source.dal.includes("page number is outside") && source.client.includes("pageNumber > totalPages") && source.e2e.includes("invalid page"), "invalid-page fixture must be checked by schema, DAL and browser");
  }
  if (fixtureMode === "invalid-rectangle") {
    requireCondition(source.schema.includes("rectangle.x + rectangle.width > 1") && source.schema.includes("rectangle.y + rectangle.height > 1") && source.e2e.includes("invalid rectangle"), "invalid-rectangle fixture must reject overflow");
  }
  if (fixtureMode === "index-failure") {
    requireCondition(source.fixtureSource.includes("isIndexFailureFixture") && source.fixtureSource.includes('"failed"') && source.client.includes("indexError") && source.client.includes("retryIndex") && source.e2e.includes("index-failure"), "index-failure fixture must retain the record and offer retry");
  }
  if (fixtureMode === "foreign-record") {
    requireCondition(source.dal.includes('.eq("user_id", session.userId)') && source.fixtureSource.includes("notFoundError") && source.e2e.includes("foreign"), "foreign-record fixture must fail closed");
  }
  if (fixtureMode === "duplicate-retry") {
    requireCondition(source.schema.includes("idempotencyKey") && source.fixtureSource.includes("retryKeys") && source.e2e.includes("idempotent"), "duplicate-retry fixture must preserve one record");
  }
}

if (failures.length > 0) {
  console.error(`notes-highlights contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`notes-highlights contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
