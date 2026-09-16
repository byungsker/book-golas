import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/web-push-contract.json"),
  fixture: path.join(root, "scripts/fixtures/web-push-negative.json"),
  package: path.join(root, "package.json"),
  migrationDirectory: path.join(root, "../supabase/migrations"),
  schema: path.join(root, "src/lib/product/contracts/web-push.ts"),
  schemaIndex: path.join(root, "src/lib/product/contracts/index.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/web-push-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/web-push-fixtures.test.ts"),
  helper: path.join(root, "src/lib/consumer/web-push.ts"),
  dal: path.join(root, "src/lib/product/dal/web-push.ts"),
  dalIndex: path.join(root, "src/lib/product/dal/index.ts"),
  settingsRoute: path.join(root, "src/app/api/consumer/notifications/route.ts"),
  pushRoute: path.join(root, "src/app/api/consumer/push/route.ts"),
  component: path.join(root, "src/components/consumer/web-push-settings-client.tsx"),
  page: path.join(root, "src/app/[locale]/(consumer)/account/notifications/page.tsx"),
  serviceWorker: path.join(root, "public/push-sw.js"),
  fixtureRegistry: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  paths: path.join(root, "src/lib/consumer/paths.ts"),
  matrix: path.join(root, "docs/consumer-parity-matrix.md"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
  e2e: path.join(root, "tests/e2e/web-push.spec.ts")
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  if (name === "migrationDirectory") continue;
  requireCondition(fs.existsSync(filePath), `missing Web Push ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size === 0) requireCondition(false, `empty Web Push ${name}: ${path.relative(root, filePath)}`);
}

const migration = fs.existsSync(paths.migrationDirectory)
  ? fs.readdirSync(paths.migrationDirectory).filter((name) => name.includes("web_push_subscriptions_and_settings")).map((name) => fs.readFileSync(path.join(paths.migrationDirectory, name), "utf8")).join("\n")
  : "";
requireCondition(migration.includes("web_push_subscriptions") && migration.includes("web_notification_settings") && migration.includes("auth.uid() = user_id"), "Web Push migration must create owner-scoped tables and RLS");

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).filter(([name]) => name !== "migrationDirectory").map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 445 && contract.task === 32 && contract.parentIssue === 412, "Web Push contract must bind issue 445/task 32/parent 412");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "Web Push contract must reference the parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "Web Push contract must target Web 1.1.0");
  requireCondition(contract.locales?.join(",") === "ko,en", "Web Push must cover ko and en");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "permission-required", "granted", "registered", "denied", "unsupported", "foreign", "registration-only", "delivery-unverified"]) requireCondition(contract.states?.includes(state), `Web Push state missing: ${state}`);
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 3, "Web Push parity rows are incomplete");
  for (const row of contract.parityRows ?? []) requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && Array.isArray(row.nativeStates) && typeof row.webRoute === "string" && typeof row.webComponent === "string" && typeof row.browserDisposition === "string", "Web Push parity rows must be machine-checkable");
  for (const feature of ["iOS widget", "Siri/App Shortcuts", "native push", "camera capture", "share sheet", "subscription and in-app purchase"]) requireCondition(contract.nativeOnly?.some((item) => item.feature === feature), `native-only feature missing: ${feature}`);
  requireCondition(fixture.issue === 445 && fixture.task === 32 && fixture.parentIssue === 412 && fixture.fixtures.length >= 9, "Web Push negative fixtures are incomplete");
  requireCondition(new Set(fixture.fixtures?.map((item) => item.name)).size === fixture.fixtures?.length, "Web Push fixture names must be unique");
  requireCondition(packageJson.scripts?.["test:web-push"]?.includes("test-web-push.mjs") && packageJson.scripts?.["test:web-push"]?.includes("web-push-fixtures.test.ts") && packageJson.scripts?.["test:web-push"]?.includes("route.test.ts"), "package must expose the Web Push acceptance command");
  requireCondition(packageJson.scripts?.["test:web-push:negative"]?.includes("--fixture denied") && packageJson.scripts?.["test:web-push:negative"]?.includes("--fixture foreign") && packageJson.scripts?.["test:web-push:negative"]?.includes("--fixture unsupported"), "package must expose Web Push negative fixtures");
  requireCondition(source.schema.includes("WebPushSubscriptionSchema") && source.schema.includes("WebPushRegistrationResponseSchema") && source.schema.includes(".strict()"), "Web Push contracts must be strict");
  requireCondition(source.dal.includes("web_push_subscriptions") && source.dal.includes("web_notification_settings") && source.dal.includes('.eq("user_id", session.value.userId)') && source.dal.includes('device_type: "web"'), "Web Push DAL must scope data to the verified user and web device");
  requireCondition(source.settingsRoute.includes("readOwnedWebPushSettings") && source.settingsRoute.includes("updateOwnedWebPushSettings") && source.settingsRoute.includes("Ownership is derived from the authenticated session") && source.settingsRoute.includes("private, no-store"), "notification settings route must be private and owner-derived");
  requireCondition(source.pushRoute.includes("registerOwnedWebPushSubscription") && source.pushRoute.includes("unregisterOwnedWebPushSubscription") && source.pushRoute.includes("Ownership is derived from the authenticated session") && source.pushRoute.includes("WebPushRegistrationResponseSchema"), "push route must validate registration and ownership");
  for (const marker of ["getBrowserPushCapability", "requestPermission", "PushManager", "serviceWorker", "web-push-enable", "web-push-disable", "ConsumerLoadingState", "ConsumerEmptyState", "ConsumerErrorState", "registration-only"]) requireCondition(source.helper.includes(marker) || source.component.includes(marker) || source.dal.includes(marker) || source.fixtureSource.includes(marker), `Web Push UI/helper must expose ${marker}`);
  requireCondition(source.component.includes("WebPushRegistrationResponseSchema") && source.component.includes("data-push-state") && source.component.includes("data-push-delivery"), "Web Push UI must validate the registration response and expose state evidence");
  requireCondition(source.serviceWorker.includes("notificationclick") && source.serviceWorker.includes("openWindow") && source.serviceWorker.includes("/books/") && source.serviceWorker.includes("bookId") && source.serviceWorker.includes("self.location.origin"), "service worker must support safe owned deep-link destinations");
  for (const forbidden of fixture.forbiddenMarkers ?? []) {
    requireCondition(!source.serviceWorker.includes(forbidden) && !source.component.includes(forbidden), `public Web Push source contains forbidden marker ${forbidden}`);
  }
  requireCondition(source.fixtureRegistry.includes('"web-push-happy"') && source.proxy.includes('startsWith("web-push-")') && source.queries.includes('startsWith("web-push-")'), "Web Push fixtures must cross the authenticated loopback boundary");
  requireCondition(source.paths.includes("account(?:\\/notifications)?") && source.page.includes("WebPushSettingsClient"), "Web Push page must be a protected consumer route");
  requireCondition(source.en.includes('"notifications"') && source.ko.includes('"notifications"') && source.en.includes('"accountNotifications"') && source.ko.includes('"accountNotifications"'), "Web Push copy must be localized");
  requireCondition(source.matrix.includes("#445") && /registration-only|delivery unverified|delivery-unverified/i.test(source.matrix), "parity matrix must state the unverified Web Push delivery boundary");
  requireCondition(source.e2e.includes("permission settings and deep-link") && source.e2e.includes("denied") && source.e2e.includes("unsupported") && source.e2e.includes("foreign") && source.e2e.includes("task-32-bookgolas-web-app-parity.png"), "Web Push browser suite must cover issue lanes and evidence");
  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown Web Push negative fixture: ${fixtureMode}`);
    if (selected) {
      requireCondition(source.fixtureSource.includes(selected.routeFixture), `${fixtureMode} must exist in the fixture source`);
      requireCondition(source.e2e.includes(selected.routeFixture), `${fixtureMode} must be exercised by browser tests`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Web Push contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Web Push contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
