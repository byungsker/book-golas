import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/home-book-list-contract.json"),
  fixture: path.join(root, "scripts/fixtures/home-book-list-negative.json"),
  manifest: path.join(root, "package.json"),
  pageSlice: path.join(root, "src/_pages/consumer-home/ui/ConsumerHomePage.tsx"),
  homeList: path.join(root, "src/_pages/consumer-home/ui/HomeBookList.tsx"),
  loading: path.join(root, "app/[locale]/(consumer)/home/loading.tsx"),
  fixtureBooks: path.join(root, "src/_pages/consumer-home/model/home-book-list-fixtures.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  routeFixture: path.join(root, "src/shared/config/consumer-route-fixture.ts"),
  proxy: path.join(root, "proxy.ts"),
  e2e: path.join(root, "tests/e2e/home-book-list.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing home/book-list ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) {
    requireCondition(fs.statSync(filePath).size > 0, `empty home/book-list ${name}: ${path.relative(root, filePath)}`);
  }
}

const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
const source = Object.fromEntries(
  Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]),
);
const productionPage = `${source.pageSlice}\n${source.homeList}`;

requireCondition(contract.issue === 429, "home/book-list contract must bind issue 429");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "home/book-list contract must reference the parity plan");
requireCondition(JSON.stringify(contract.views) === JSON.stringify(["reading", "planned", "completed", "paused", "all"]), "home/book-list contract must preserve the native five views");
for (const status of ["reading", "planned", "completed", "will_retry"]) {
  requireCondition(contract.statuses.includes(status), `home/book-list contract must cover ${status}`);
}
for (const state of ["loading", "ready", "empty", "error", "unauthorized", "offline"]) {
  requireCondition(contract.states.includes(state), `home/book-list contract must cover ${state}`);
}
requireCondition(contract.dataPolicy.ownerScoped && contract.dataPolicy.excludeSoftDeleted && contract.dataPolicy.stableOrdering, "home/book-list contract must state collection safety policies");
requireCondition(typeof manifest.scripts["test:home-book-list"] === "string", "package must expose the home/book-list acceptance command");
requireCondition(typeof manifest.scripts["test:home-book-list:negative"] === "string", "package must expose the home/book-list negative command");
requireCondition(source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)'), "book collection must remain owner scoped and exclude soft-deleted rows");
requireCondition(source.queries.includes('.order("updated_at"') && source.queries.includes('.order("id"'), "book collection must have a deterministic server ordering");
requireCondition(source.routeFixture.includes('"home-book-list"') && source.proxy.includes('"home-book-list"'), "home seeded fixtures must be explicitly allowlisted at the loopback route boundary");
requireCondition(source.fixtureBooks.includes("getHomeBookListFixtureBooks") && source.fixtureBooks.includes("deleted_at"), "seeded fixture data must be isolated from the production Home module and filter deleted rows");
requireCondition(source.ko.includes('"statusEmpty"') && source.en.includes('"statusEmpty"'), "both Korean and English status empty messages must be present");
requireCondition(fixture.forbiddenLandingMarkers.length >= 3, "negative fixture must include landing-data markers");
for (const marker of fixture.requiredGuards) requireCondition(typeof marker === "string" && marker.length > 0, `negative fixture guard is empty: ${marker}`);

if (fixtureMode === "hard-coded-landing") {
  for (const marker of fixture.forbiddenLandingMarkers) {
    requireCondition(!productionPage.includes(marker), `production Home contains forbidden landing fixture marker: ${marker}`);
  }
  for (const guard of fixture.requiredGuards) {
    requireCondition(source.fixtureBooks.includes(guard) || source.routeFixture.includes(guard) || source.queries.includes(guard), `home fixture safety guard is missing: ${guard}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  fixtureMode === "hard-coded-landing"
    ? `home/book-list negative fixture passed: ${fixture.forbiddenLandingMarkers.length} landing markers stay outside ConsumerHomePage`
    : "home/book-list contract passed: five status views, owner/deleted guards, stable ordering and state boundaries",
);
