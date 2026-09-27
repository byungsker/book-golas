import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/account-settings-contract.json"),
  fixture: path.join(root, "scripts/fixtures/account-settings-negative.json"),
  package: path.join(root, "package.json"),
  schema: path.join(root, "src/lib/product/contracts/account-settings.ts"),
  schemaTest: path.join(root, "src/lib/product/contracts/account-settings.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/account-settings-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/account-settings-fixtures.test.ts"),
  adapter: path.join(root, "src/lib/product/adapters/avatar-storage.ts"),
  adapterTest: path.join(root, "src/lib/product/adapters.avatar-storage.test.ts"),
  dal: path.join(root, "src/lib/product/dal/account-settings.ts"),
  dalTest: path.join(root, "src/lib/product/dal.account-settings.test.ts"),
  route: path.join(root, "src/app/api/consumer/account/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/account/route.test.ts"),
  avatarRoute: path.join(root, "src/app/api/consumer/account/avatar/route.ts"),
  avatarRouteTest: path.join(root, "src/app/api/consumer/account/avatar/route.test.ts"),
  component: path.join(root, "src/components/consumer/account-settings-client.tsx"),
  accountPage: path.join(root, "src/app/[locale]/(consumer)/account/page.tsx"),
  subscriptionPage: path.join(root, "src/app/[locale]/(consumer)/subscription/page.tsx"),
  fixtureRegistry: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  theme: path.join(root, "src/components/consumer/blab-theme-sync.tsx"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
  migration: path.join(root, "../supabase/migrations/20260916123000_private_account_avatars.sql"),
  e2e: path.join(root, "tests/e2e/account-settings.spec.ts")
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing account settings ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty account settings ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 444 && contract.task === 31 && contract.parentIssue === 412, "account settings contract must bind issue 444/task 31/parent 412");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "account settings contract must reference the parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "account settings contract must target Web 1.1.0");
  requireCondition(contract.locales?.join(",") === "ko,en", "account settings must cover ko and en");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "disabled"]) requireCondition(contract.states?.includes(state), `account settings state missing: ${state}`);
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 5, "account settings parity rows are incomplete");
  for (const row of contract.parityRows ?? []) requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && Array.isArray(row.nativeStates) && typeof row.webRoute === "string" && typeof row.webComponent === "string" && typeof row.browserDisposition === "string", "account settings parity rows must be machine-checkable");
  for (const feature of ["iOS widget", "Siri/App Shortcuts", "native push", "camera capture", "share sheet", "subscription and in-app purchase"]) requireCondition(contract.nativeOnly?.some((item) => item.feature === feature), `native-only feature missing: ${feature}`);
  requireCondition(fixture.issue === 444 && fixture.task === 31 && fixture.fixtures.length >= 8, "account settings negative fixtures are incomplete");
  requireCondition(new Set(fixture.fixtures?.map((item) => item.name)).size === fixture.fixtures?.length, "account settings fixture names must be unique");
  requireCondition(packageJson.scripts?.["test:account-settings"]?.includes("account-settings.test.ts") && packageJson.scripts?.["test:account-settings"]?.includes("route.test.ts"), "package must expose the account settings acceptance command");
  requireCondition(packageJson.scripts?.["test:account-settings:negative"]?.includes("--fixture foreign") && packageJson.scripts?.["test:account-settings:negative"]?.includes("--fixture unauthorized"), "package must expose account settings negative fixtures");
  requireCondition(source.schema.includes("AccountProfileSchema") && source.schema.includes("AccountProfileUpdateRequestSchema") && source.schema.includes(".strict()"), "account settings contracts must be strict");
  requireCondition(source.route.includes("readOwnedAccountSettings") && source.route.includes("updateOwnedAccountProfile") && source.route.includes("Ownership is derived from the authenticated session") && source.route.includes("user_id") && source.route.includes("private, no-store"), "account route must derive ownership and stay private");
  requireCondition(source.avatarRoute.includes("uploadOwnedAccountAvatar") && source.avatarRoute.includes("formData") && source.avatarRoute.includes("user_id") && source.avatarRoute.includes("maxAvatarBytes"), "avatar route must validate multipart ownership and size");
  requireCondition(source.dal.includes('.eq("id", session.value.userId)') && source.dal.includes("uploadOwnedAvatarForSession") && source.dal.includes("storage://account-avatars/"), "account DAL must scope profile and avatar writes to the verified user");
  requireCondition(source.adapter.includes("privateAvatarsBucket") && source.adapter.includes("assertOwnedAvatarPath") && source.adapter.includes("createSignedUrl") && source.adapter.includes("upsert: true"), "avatar adapter must use private owner-scoped signed storage");
  requireCondition(source.migration.includes("public") && source.migration.includes("false") && source.migration.includes("auth.uid()::text") && source.migration.includes("bucket_id = 'account-avatars'"), "avatar migration must create a private owner policy");
  for (const marker of ["account-profile-nickname", "account-avatar-input", "account-avatar-save", "account-theme-${value}", "account-language-confirm", "account-password-dialog", "account-terms-link", "account-privacy-link", "account-subscription-status", "account-settings-saved", "ConsumerLoadingState", "ConsumerEmptyState", "ConsumerErrorState", "updateUser", "localStorage"]) requireCondition(source.component.includes(marker), `account settings UI must expose ${marker}`);
  for (const forbidden of ["purchase", "restore", "upgrade", "customer-center"]) requireCondition(!source.component.toLowerCase().includes(forbidden), `account settings UI must not expose billing control marker ${forbidden}`);
  requireCondition(source.fixtureRegistry.includes('"account-settings-happy"') && source.proxy.includes('startsWith("account-settings-")') && source.queries.includes('startsWith("account-settings-")'), "account settings fixtures must cross the authenticated loopback boundary");
  requireCondition(source.theme.includes("bookgolas.theme") && source.theme.includes("bookgolas-theme-change"), "theme preference must survive the consumer shell");
  requireCondition(source.en.includes('"accountSettings"') && source.ko.includes('"accountSettings"') && source.en.includes('"subscriptionDisabled"') && source.ko.includes('"subscriptionDisabled"'), "account settings copy must be localized");
  requireCondition(source.subscriptionPage.includes('data-subscription-enabled="false"') && source.subscriptionPage.includes('data-route-state="disabled"'), "subscription page must expose a disabled status contract");
  requireCondition(source.e2e.includes("profile") && source.e2e.includes("avatar") && source.e2e.includes("theme") && source.e2e.includes("language") && source.e2e.includes("foreign") && source.e2e.includes("password") && source.e2e.includes("subscription") && source.e2e.includes("task-31-bookgolas-web-app-parity.png"), "account settings browser suite must cover issue-defined lanes and evidence");
  for (const marker of fixture.forbiddenMarkers ?? []) requireCondition(!source.component.toLowerCase().includes(marker.toLowerCase()), `account settings UI contains forbidden marker ${marker}`);
  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown account settings negative fixture: ${fixtureMode}`);
    if (selected) {
      requireCondition(source.fixtureSource.includes(selected.routeFixture), `${fixtureMode} must exist in the fixture source`);
      requireCondition(source.e2e.includes(selected.routeFixture), `${fixtureMode} must be exercised by browser tests`);
      if (selected.expected.code) {
        const errorMarkers = { validation_error: "validationError", provider_error: "providerError", unauthorized: "unauthorizedError", consent_required: "consentRequiredError", quota_exceeded: "quotaExceededError", offline: "offlineError", unavailable: "unavailableError" };
        const marker = errorMarkers[selected.expected.code] ?? selected.expected.code;
        requireCondition(source.fixtureSource.includes(`"${selected.expected.code}"`) || source.fixtureSource.includes(marker) || source.route.includes(`"${selected.expected.code}"`) || source.avatarRoute.includes(`"${selected.expected.code}"`), `${fixtureMode} must preserve ${selected.expected.code}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Account settings contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Account settings contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
