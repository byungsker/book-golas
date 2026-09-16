import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fixturePath = path.join(root, "scripts/fixtures/account-deletion-negative.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const sourcePaths = {
  package: path.join(root, "package.json"),
  component: path.join(root, "src/components/consumer/account-settings-client.tsx"),
  helper: path.join(root, "src/lib/consumer/account-deletion.ts"),
  helperTest: path.join(root, "src/lib/consumer/account-deletion.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/account-deletion-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/account-deletion-fixtures.test.ts"),
  route: path.join(root, "src/app/api/consumer/account/deletion/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/account/deletion/route.test.ts"),
  completionPage: path.join(root, "src/app/[locale]/account-deleted/page.tsx"),
  messagesEn: path.join(root, "messages/en.json"),
  messagesKo: path.join(root, "messages/ko.json"),
  edgeFunction: path.join(root, "../supabase/functions/delete-user/index.ts"),
  e2e: path.join(root, "tests/e2e/account-deletion.spec.ts"),
  evidence: path.join(root, "../.omo/evidence/bookgolas-web-app-parity/task-34-bookgolas-web-app-parity.sql")
};
const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};
const source = {};

for (const [name, filePath] of Object.entries(sourcePaths)) {
  requireCondition(fs.existsSync(filePath), `missing account deletion ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) source[name] = fs.readFileSync(filePath, "utf8");
}

requireCondition(fixture.issue === 446 && fixture.task === 34 && fixture.parentIssue === 412, "account deletion fixture is not bound to issue 446/task 34/parent 412");
requireCondition(fixture.plan === ".omo/plans/bookgolas-web-app-parity.md", "account deletion fixture must reference the parity plan");
requireCondition(fixture.targetVersion === "1.1.0" && fixture.targetBranch === "version/web/1.1.0", "account deletion target is not Web 1.1.0");
requireCondition(fixture.featureBranch === "codex/feature/web/1.1.0/BOK-446-account-deletion", "account deletion feature branch is incorrect");
requireCondition(fixture.canonicalFunction === "delete-user" && fixture.localOnlyVerification === true, "account deletion must use the canonical local-only function boundary");
requireCondition(Array.isArray(fixture.fixtures) && fixture.fixtures.length >= 7, "account deletion negative fixtures are incomplete");
requireCondition(new Set(fixture.fixtures?.map((item) => item.name)).size === fixture.fixtures?.length, "account deletion fixture names must be unique");
requireCondition(source.package?.includes('"test:account-deletion": "node scripts/test-account-deletion.mjs"'), "package must expose the account deletion acceptance command");
requireCondition(source.package?.includes('"test:account-deletion:negative": "node scripts/test-account-deletion.mjs --grep cancel-or-retry"'), "package must expose the cancel-or-retry command");
for (const marker of ["AccountDeletionRequestSchema", "signInWithPassword", "auth.getUser", "auth.getSession", "delete-user", "auth.signOut", "currentPassword", "no-store", "Ownership is derived from the authenticated session"]) requireCondition(source.route?.includes(marker), `account deletion route is missing ${marker}`);
for (const marker of ["account-delete-open", "account-delete-dialog", "account-delete-form", "account-delete-confirmation", "account-delete-password", "clearAccountDeletionClientState", "account-deleted"]) requireCondition(source.component?.includes(marker), `account deletion UI is missing ${marker}`);
for (const marker of ["clearBrowserTimerState", "sessionStorage", "bookgolas.", "sb-"]) requireCondition(source.helper?.includes(marker), `account deletion cache cleanup is missing ${marker}`);
for (const marker of ["confirmation", "auth.admin.deleteUser", "account_deletion_operations", "fcm_tokens", "user_consents", "book-images", "avatars"]) requireCondition(source.edgeFunction?.includes(marker), `canonical delete-user contract is missing ${marker}`);
requireCondition(source.completionPage?.includes("account-deleted-page") && source.completionPage?.includes("getTranslations"), "public account completion page is incomplete");
requireCondition(source.e2e?.includes("cancel leaves") && source.e2e?.includes("repeated confirmation") && source.e2e?.includes("account-deleted"), "account deletion browser scenarios are incomplete");
requireCondition(source.messagesEn?.includes('"accountDeleted"') && source.messagesKo?.includes('"accountDeleted"'), "account deletion completion copy is not localized");
requireCondition(source.messagesEn?.includes('"deleteConfirmationWord": "DELETE"') && source.messagesKo?.includes('"deleteConfirmationWord": "삭제"'), "destructive confirmation copy is not localized");
requireCondition(!source.component?.includes("\.from(") && !source.component?.includes("deleteUser"), "account UI must not perform client-side cascading deletion");
requireCondition(!source.route?.includes("SUPABASE_SERVICE_ROLE_KEY") && !source.component?.includes("SERVICE_ROLE"), "service-role secrets must not cross the Web boundary");
requireCondition(source.evidence?.includes("RED") && source.evidence?.includes("GREEN") && source.evidence?.includes("SURFACE") && source.evidence?.includes("CLEANUP"), "account deletion evidence must contain all four stages");
requireCondition(source.evidence?.includes("Plan: .omo/plans/bookgolas-web-app-parity.md"), "account deletion evidence is missing the plan footer");

const grepIndex = process.argv.indexOf("--grep");
const grep = grepIndex >= 0 ? process.argv[grepIndex + 1] : null;
if (grep) requireCondition(grep === "cancel-or-retry", `unknown account deletion grep: ${grep}`);

if (failures.length > 0) {
  console.error(`Account deletion contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const vitest = path.join(root, "node_modules/.bin/vitest");
const vitestArgs = [
  "run",
  "src/lib/consumer/account-deletion.test.ts",
  "src/lib/consumer/account-deletion-fixtures.test.ts",
  "src/app/api/consumer/account/deletion/route.test.ts"
];
if (grep) vitestArgs.push("--testNamePattern", grep);
const result = spawnSync(vitest, vitestArgs, { cwd: root, stdio: "inherit" });
if (result.error) {
  console.error(`account deletion tests could not start: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Account deletion contract passed${grep ? ` (${grep})` : ""}`);
