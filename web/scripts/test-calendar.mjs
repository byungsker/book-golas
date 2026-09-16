import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/calendar-contract.json"),
  fixture: path.join(root, "scripts/fixtures/calendar-negative.json"),
  manifest: path.join(root, "package.json"),
  calendarSource: path.join(root, "src/lib/product/contracts/calendar.ts"),
  calendarTest: path.join(root, "src/lib/product/contracts/calendar.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/calendar-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/calendar-fixtures.test.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  page: path.join(root, "src/app/[locale]/(consumer)/calendar/page.tsx"),
  loading: path.join(root, "src/app/[locale]/(consumer)/calendar/loading.tsx"),
  error: path.join(root, "src/app/[locale]/(consumer)/calendar/error.tsx"),
  client: path.join(root, "src/components/consumer/calendar-client.tsx"),
  e2e: path.join(root, "tests/e2e/calendar.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing calendar ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty calendar ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 439 && contract.task === 26, "calendar contract must bind issue 439/task 26");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "calendar contract must reference the parity plan");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "foreign", "completed", "paused", "planned", "timezone", "day-detail"]) requireCondition(contract.states.includes(state), `calendar contract must cover ${state}`);
  for (const operation of ["month_navigation", "month_picker", "filter", "kst_day_assignment", "stable_progress_events", "stable_session_events", "day_detail", "owned_books_only", "canonical_book_navigation", "planned_marker_non_historical"]) requireCondition(contract.operations.includes(operation), `calendar contract must cover ${operation}`);
  requireCondition(contract.native.filterValues.join(",") === "all,reading,completed", "calendar filter values must match the native surface");
  requireCondition(fixture.issue === 439 && fixture.task === 26 && fixture.fixtures.length >= 5, "calendar negative fixtures must cover timezone, ownership and status boundaries");
  requireCondition(manifest.scripts["test:calendar"] === "node scripts/test-calendar.mjs && vitest run src/lib/product/contracts/calendar.test.ts src/lib/consumer/calendar-fixtures.test.ts", "package must expose the exact calendar acceptance command");
  requireCondition(manifest.scripts["test:calendar:negative"] === "node scripts/test-calendar.mjs --fixture timezone && node scripts/test-calendar.mjs --fixture foreign && node scripts/test-calendar.mjs --fixture deleted && node scripts/test-calendar.mjs --fixture unauthorized", "package must expose the calendar negative command");
  requireCondition(source.calendarSource.includes('CALENDAR_TIME_ZONE = "Asia/Seoul"') && source.calendarSource.includes("getCalendarMonthBounds") && source.calendarSource.includes("calendarDayKeyFromIso"), "calendar source must make the KST boundary explicit");
  requireCondition(source.calendarSource.includes("stable source event") && source.calendarSource.includes("plannedStartDate") && source.calendarSource.includes('getBookDay(day, book, "planned")'), "calendar source must separate stable history from planned markers");
  requireCondition(source.queries.includes("fetchOwnedCalendarData") && source.queries.includes('from("reading_progress_history")') && source.queries.includes('from("reading_sessions")'), "calendar query must read both stable event sources");
  requireCondition(source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)') && source.queries.includes("buildCalendarData"), "calendar query must enforce owner and active-book scope");
  requireCondition(source.fixtureSource.includes("calendar-foreign") && source.fixtureSource.includes("calendar-empty") && source.fixtureSource.includes("calendar-unauthorized") && source.fixtureSource.includes("calendar-offline"), "calendar fixtures must cover ownership and typed failure paths");
  requireCondition(source.routeFixture.includes('"calendar-happy"') && source.proxy.includes('startsWith("calendar-")'), "calendar fixtures must cross the authenticated loopback boundary");
  requireCondition(source.page.includes("fetchOwnedCalendarData") && source.page.includes("getConsumerSignInRedirectPath") && source.page.includes('data-route-state="error"'), "calendar page must keep auth and error boundaries explicit");
  requireCondition(source.client.includes("calendar-day-detail") && source.client.includes("calendar-previous-month") && source.client.includes("calendar-month-picker") && source.client.includes('filter === initialData.filter'), "calendar client must expose native-equivalent controls and detail panel");
  requireCondition(source.client.includes("/books/${book.bookId}") && source.client.includes("plannedDescription") && source.client.includes("data-calendar-timezone"), "calendar client must use canonical book links and explain planned/KST behavior");
  requireCondition(source.loading.includes('data-route-state="pending"') && source.error.includes('data-route-state="error"'), "calendar route states must include loading and error surfaces");
  requireCondition(source.ko.includes('"calendar"') && source.en.includes('"calendar"') && source.ko.includes('"plannedDescription"') && source.en.includes('"plannedDescription"'), "calendar copy must be localized in Korean and English");
  requireCondition(source.e2e.includes("calendar month navigation and filters") && source.e2e.includes("calendar day-detail opens owned book") && source.e2e.includes("calendar timezone keeps UTC midnight events on the correct KST day"), "calendar happy browser scenarios must be named");
  requireCondition(source.e2e.includes("calendar empty state") && source.e2e.includes("calendar network failure") && source.e2e.includes("calendar foreign events stay out of day detail"), "calendar failure browser scenarios must be named");
  requireCondition(source.e2e.includes("task-26-bookgolas-web-app-parity.png"), "calendar browser suite must capture issue evidence");

  if (fixtureMode === "timezone") {
    requireCondition(fixture.fixtures.some((item) => item.name === "timezone-boundary" && item.expectedKstDays.join(",") === "2026-09-01,2026-09-02"), "timezone fixture must assert the KST boundary days");
    requireCondition(source.calendarTest.includes("2026-09-01T14:59:59.000Z") && source.calendarTest.includes("2026-09-01T15:00:00.000Z"), "timezone test must assert both sides of the UTC boundary");
  }
  if (fixtureMode === "foreign") {
    requireCondition(fixture.fixtures.some((item) => item.name === "foreign-event"), "foreign fixture is missing");
    requireCondition(source.fixtureTest.includes("004398") && source.e2e.includes("Foreign Private title"), "foreign fixture must assert private title absence");
  }
  if (fixtureMode === "deleted") {
    requireCondition(fixture.fixtures.some((item) => item.name === "deleted-book"), "deleted fixture is missing");
    requireCondition(source.e2e.includes("Deleted Private title") && source.fixtureSource.includes("calendar-deleted"), "deleted fixture must keep deleted book data out of the detail panel");
  }
  if (fixtureMode === "unauthorized") {
    requireCondition(source.fixtureSource.includes("unauthorizedError") && source.page.includes("getConsumerSignInRedirectPath"), "unauthorized fixture must use the shared sign-in boundary");
  }
}

if (failures.length > 0) {
  console.error(`calendar contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`calendar contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
