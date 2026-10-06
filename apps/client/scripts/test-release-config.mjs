import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const adminRoot = path.join(repositoryRoot, "apps", "admin");
const configPath = path.join(webRoot, "docs", "consumer-web-release-config.json");
const negativeFixturePath = path.join(webRoot, "scripts", "fixtures", "release-config-negative.json");
const packagePath = path.join(webRoot, "package.json");
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    failures.push("missing or unreadable file: " + path.relative(repositoryRoot, filePath));
    return "";
  }
}

function readJson(filePath) {
  const source = readText(filePath);
  if (!source) return {};
  try {
    return JSON.parse(source);
  } catch {
    failures.push("invalid JSON: " + path.relative(repositoryRoot, filePath));
    return {};
  }
}

function requireIncludes(source, label, values) {
  for (const value of values) {
    requireCondition(source.includes(value), label + " is missing " + value);
  }
}

function collectAdminHandlerFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectAdminHandlerFiles(entryPath));
    if (entry.isFile() && entry.name.endsWith(".ts") && entry.name !== "index.ts") {
      files.push(entryPath);
    }
  }
  return files;
}

const config = readJson(configPath);
const negativeFixture = readJson(negativeFixturePath);
const packageJson = readJson(packagePath);
const qualityWorkflow = readText(path.join(repositoryRoot, ".github", "workflows", "quality.yml"));
const args = process.argv.slice(2);
const fixtureIndex = args.indexOf("--fixture");
const fixtureName = fixtureIndex >= 0 ? args[fixtureIndex + 1] : "";
const environmentIndex = args.indexOf("--environment");
const environmentName = environmentIndex >= 0 ? args[environmentIndex + 1] : "";
const envExample = readText(path.join(webRoot, ".env.example"));
const rootLayout = readText(path.join(webRoot, "src", "_app", "layouts", "root", "RootLayout.tsx"));
const localizedLayout = readText(path.join(webRoot, "src", "_app", "layouts", "locale", "LocaleLayout.tsx"));
const termsPage = readText(path.join(webRoot, "src", "_pages", "legal", "terms", "ui", "TermsPage.tsx"));
const supportPage = readText(path.join(webRoot, "src", "_pages", "legal", "support", "ui", "SupportPage.tsx"));
const privacyPage = readText(path.join(webRoot, "src", "_pages", "legal", "privacy", "ui", "PrivacyPage.tsx"));
const rootPrivacy = readText(path.join(webRoot, "src", "_pages", "privacy-redirect", "ui", "PrivacyRedirectPage.tsx"));
const rootTerms = readText(path.join(webRoot, "src", "_pages", "terms-redirect", "ui", "TermsRedirectPage.tsx"));
const rootSupport = readText(path.join(webRoot, "src", "_pages", "support-redirect", "ui", "SupportRedirectPage.tsx"));
const subscriptionPage = readText(path.join(webRoot, "src", "_pages", "subscription", "ui", "SubscriptionPage.tsx"));
const englishMessages = readText(path.join(webRoot, "messages", "en.json"));
const koreanMessages = readText(path.join(webRoot, "messages", "ko.json"));
const adminProxy = readText(path.join(adminRoot, "proxy.ts"));
const adminAuth = readText(path.join(adminRoot, "src", "_app", "auth", "admin.ts"));
const adminAuthPublicApi = readText(path.join(adminRoot, "src", "_app", "auth", "index.server.ts"));
const adminEmail = readText(path.join(adminRoot, "src", "shared", "auth", "admin-email", "index.ts"));
const supabaseConfig = readText(path.join(repositoryRoot, "supabase", "config.toml"));
const edgeContract = readText(path.join(repositoryRoot, "supabase", "functions", "_shared", "consumer-contract.ts"));
const routeSpec = readText(path.join(webRoot, "tests", "e2e", "routes.spec.ts"));
const runbook = readText(path.join(webRoot, "docs", "consumer-web-release-runbook.md"));
const contractGateRunner = readText(path.join(webRoot, "scripts", "run-contract-gate.mjs"));
const allBrowserRunner = readText(path.join(webRoot, "scripts", "run-all-browsers.mjs"));

requireCondition(config.schemaVersion === 1, "release config schemaVersion must be 1");
requireCondition(config.issue === 448, "release config issue must be 448");
requireCondition(config.task === 36, "release config task must be 36");
requireCondition(config.parentIssue === 412, "release config parentIssue must be 412");
requireCondition(config.plan === ".omo/plans/bookgolas-web-app-parity.md", "release config plan footer is incorrect");
requireCondition(config.deliveryUnit === "client", "release config delivery unit must be client");
requireCondition(config.targetVersion === "1.1.0", "release config target version must be 1.1.0");
requireCondition(config.sourceBranch === "version/web/1.1.0", "release config source branch is incorrect");
requireCondition(config.seedSha === "d9ce0799414a84acdee9f5a7585ae9cdc1cdf46c", "release config seed SHA is incorrect");
requireCondition(config.targetBranch === "version/client/1.1.0", "release config target branch is incorrect");
requireCondition(config.lineStatus === "planned", "release config line status must remain planned until attested");
requireCondition(config.featureBranch === null, "planned release config must not declare a product feature branch");
requireCondition(config.nextVersion === "16.3.0-preview.8", "release config Next version is stale");
requireCondition(config.nodeVersion === "22", "release config Node version must be 22");
requireCondition(config.runtime?.buildCommand === "npm run build", "runtime build command is incorrect");
requireCondition(config.runtime?.buildGate === "npm run test:release-config", "runtime build gate is missing");
requireCondition(config.runtime?.releaseGate === "npm run test:release-gate", "runtime release gate is missing");
requireCondition(config.runtime?.typecheckCommand === "npm run typecheck", "runtime typecheck command is missing");
requireCondition(config.runtime?.allBrowserCommand === "npm run test:e2e:all", "runtime all-browser command is missing");
requireCondition(config.runtime?.fixtureServer === "loopback-only", "fixture server must be loopback-only");
const completionPreflight = config.completionPreflight;
requireCondition(completionPreflight?.fixtureReset?.command === "npm run reset:fixtures", "completion fixture reset command is missing"); requireCondition(completionPreflight?.fixtureReset?.runtimeCheck === "npm run test:fixtures:runtime", "completion fixture runtime check is missing");
requireCondition(completionPreflight?.fixtureReset?.scope === "local Docker-backed Supabase only", "completion fixture scope is unsafe");
requireCondition(completionPreflight?.fixtureReset?.supabaseCli === "npx --yes supabase@2.108.0", "completion fixture Supabase CLI is not pinned");
for (const tool of ["Docker daemon", "Supabase CLI", "installed web dependencies"]) requireCondition(completionPreflight?.fixtureReset?.requiredTools?.includes(tool), `completion fixture prerequisite is missing: ${tool}`);
requireCondition(completionPreflight?.fixtureReset?.localDockerContext === "colima" && completionPreflight?.fixtureReset?.blockedDependency?.owner === "local Colima operator" && completionPreflight?.fixtureReset?.blockedDependency?.missingDependency === "local Docker daemon/socket" && completionPreflight?.fixtureReset?.blockedDependency?.command === "docker --context colima info --format {{.ServerVersion}}" && completionPreflight?.fixtureReset?.blockedDependency?.timeoutMs === 15000 && completionPreflight?.fixtureReset?.blockedDependency?.nextStep === "Start Colima, wait for the local socket, then rerun npm run test:fixtures:runtime.", "completion Docker blocker metadata is incomplete");
requireCondition(completionPreflight?.browser?.listCommand === "npx playwright test --list", "completion browser list command is missing");
for (const browser of ["chromium", "firefox", "webkit"]) requireCondition(completionPreflight?.browser?.requiredBinaries?.includes(browser), `completion browser binary is missing: ${browser}`);
requireCondition(completionPreflight?.browser?.fixtureServer === "loopback-only", "completion browser fixture server is unsafe");
for (const environmentName of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "WEB_ALLOWED_ORIGINS"]) requireCondition(completionPreflight?.preview?.requiredEnvironment?.includes(environmentName), `completion preview environment is missing: ${environmentName}`);
const previewBlockedDependency = completionPreflight?.preview?.blockedDependency;
requireCondition(previewBlockedDependency?.status === "blocked" && previewBlockedDependency?.owner === "Bookgolas release owner / Preview environment administrator" && previewBlockedDependency?.missingDependency === "isolated Preview credentials/origin: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, WEB_ALLOWED_ORIGINS" && previewBlockedDependency?.nextStep === "Provision isolated Preview credentials and origin through the deployment secret store without exposing values, then rerun hosted Preview CORS/JWT/RLS/email/provider-stub checks.", "completion Preview blocked dependency metadata is incomplete");
for (const assertion of ["CORS OPTIONS reflects only the configured Preview origin", "JWT private access calls auth.getUser", "RLS limits disposable users to auth.uid() owned rows"]) requireCondition(completionPreflight?.preview?.corsJwtRls?.includes(assertion), `completion CORS/JWT/RLS assertion is missing: ${assertion}`);
requireCondition(completionPreflight?.preview?.testIdentities?.emailPassword?.email === "fixture-user-a@local.invalid", "completion email/password identity is missing"); requireCondition(completionPreflight?.preview?.testIdentities?.oauth?.email === "oauth-reader@local.invalid", "completion OAuth identity is missing");
requireCondition(completionPreflight?.providers?.ai?.mode === "route fixture stub", "completion AI stub is missing"); requireCondition(completionPreflight?.providers?.ocr?.mode === "route fixture stub", "completion OCR stub is missing");
requireCondition(completionPreflight?.cleanup?.rule === "Remove only task-owned temporary files and processes; do not stop shared infrastructure.", "completion cleanup rule is missing");
requireCondition(completionPreflight?.evidence?.directory === ".omo/evidence/bookgolas-web-completion", "completion evidence directory is incorrect"); requireCondition(completionPreflight?.evidence?.receipt === ".omo/evidence/bookgolas-web-completion/task-5-bookgolas-web-completion.md", "completion evidence receipt is incorrect");
for (const section of ["SCENARIO", "INVOCATION", "OBSERVABLE", "ARTIFACT"]) requireCondition(completionPreflight?.evidence?.requiredSections?.includes(section), `completion evidence section is missing: ${section}`);
for (const component of ["node_modules", ".next", "playwright-report", "test-results", ".cache"]) requireCondition(completionPreflight?.evidence?.rejectedPathComponents?.includes(component), `completion evidence cache rejection is missing: ${component}`);
requireCondition(completionPreflight?.failClosed?.missingEnvironmentFixture === "missing-required-env", "completion missing-environment fixture is incorrect"); requireCondition(completionPreflight?.failClosed?.phase === "before-next-build", "completion missing-environment phase is incorrect");
requireCondition(packageJson.dependencies?.next === config.nextVersion, "package Next version does not match release config");
requireCondition(packageJson.scripts?.build === "pnpm run test:release-config && pnpm run test:fsd && next build", "build must run release and FSD boundary checks before Next build");
requireCondition(packageJson.scripts?.["test:release-config"] === "node scripts/test-release-config.mjs", "positive release config script is missing");
requireCondition(packageJson.scripts?.["test:fsd"] === "node scripts/test-fsd-boundaries.mjs", "FSD boundary script is missing");
requireCondition(packageJson.scripts?.["test:release-config:negative"] === "node scripts/test-release-config.mjs --fixture missing-required-env", "negative release config script is missing");
requireCondition(packageJson.scripts?.test === "npm run test:release-config && npm run test:unit && npm run test:contracts", "full test must run release config, unit, and focused contract gates");
requireCondition(packageJson.scripts?.["test:release-gate"] === "npm test && npm run lint && npm run typecheck && npm run build && npm run test:e2e:all", "release gate must run test, lint, typecheck, build, and all-browser Playwright");
requireCondition(packageJson.scripts?.["test:e2e:all"] === "node scripts/run-all-browsers.mjs", "all-browser gate must use the versioned browser runner");
requireIncludes(allBrowserRunner, "all-browser runner", ["chromium", "firefox", "webkit", "--workers=1", "--retries=0", "attempt <= 2", "failed both fresh-process attempts"]);

const configuredContractScripts = config.verification?.contractScripts ?? [];
const intentionalFailureScripts = config.verification?.intentionalFailureScripts ?? [];
requireCondition(packageJson.scripts?.["test:contracts"] === "node scripts/run-contract-gate.mjs", "focused contract aggregate must use the versioned gate runner");
requireIncludes(contractGateRunner, "contract gate runner", ["config.verification?.contractScripts", "spawnSync", "expectedStatus"]);
let aggregateCommands = [...configuredContractScripts];
const missingGateFixture = negativeFixture.fixtures?.["missing-gate-command"];
if (fixtureName === "missing-gate-command") {
  aggregateCommands = aggregateCommands.filter(
    (scriptName) => scriptName !== (missingGateFixture?.missing ?? "test:auth-boundary"),
  );
}
requireCondition(configuredContractScripts.length > 0, "release config contract command inventory is empty");
for (const scriptName of configuredContractScripts) {
  requireCondition(typeof packageJson.scripts?.[scriptName] === "string", `package script is missing: ${scriptName}`);
  requireCondition(aggregateCommands.includes(scriptName), `aggregate gate is missing command: ${scriptName}`);
}
requireCondition(new Set(aggregateCommands).size === aggregateCommands.length, "aggregate gate contains duplicate commands");
requireCondition(aggregateCommands.length === configuredContractScripts.length, "aggregate gate command count does not match release inventory");
for (const scriptName of intentionalFailureScripts) requireCondition(configuredContractScripts.includes(scriptName), `intentional failure command is outside the contract inventory: ${scriptName}`);
requireCondition(intentionalFailureScripts.length === 1 && intentionalFailureScripts[0] === "test:session-lifecycle:negative", "intentional failure command inventory is incorrect");
requireCondition((qualityWorkflow.match(/^\s*run: npm run test:release-gate$/gm) ?? []).length === 1, "quality workflow must invoke the release gate exactly once");
requireCondition(!/secrets\.|SUPABASE_(?:ACCESS_TOKEN|SERVICE_ROLE_KEY|PROJECT_REF)/.test(qualityWorkflow), "quality workflow must remain secrets-free");
requireIncludes(envExample, ".env.example", [
  "NEXT_PUBLIC_SUPABASE_URL=",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
  "SUPABASE_SERVICE_ROLE_KEY="
]);
requireIncludes(rootLayout, "root layout", ["metadataBase: new URL(\"https://bookgolas.com\")", "lang={locale}"]);
requireIncludes(localizedLayout, "localized layout", ["openGraph", "locale"]);
requireIncludes(termsPage, "localized terms page", ["generateMetadata", "getTranslations"]);
requireIncludes(supportPage, "localized support page", ["generateMetadata", "getTranslations"]);
requireIncludes(privacyPage, "localized privacy page", ["generateMetadata", "getTranslations"]);
requireIncludes(rootPrivacy, "root privacy redirect", ["redirect(\"/ko/privacy\")"]);
requireIncludes(rootTerms, "root terms redirect", ["redirect(\"/ko/terms\")"]);
requireIncludes(rootSupport, "root support redirect", ["redirect(\"/ko/support\")"]);
requireIncludes(englishMessages, "English legal/support copy", [
  "Web subscription and billing controls are unavailable.",
  "Web subscriptions and billing are unavailable.",
  "native app",
  "Last updated: September 2026"
]);
requireIncludes(koreanMessages, "Korean legal/support copy", [
  "Web에서는 구독과 결제 기능을 사용할 수 없습니다.",
  "Web 구독과 결제는 사용할 수 없습니다.",
  "네이티브 앱",
  "최종 업데이트: 2026년 9월"
]);
for (const staleCopy of [
  "Subscriptions renew automatically",
  "구독 서비스의 경우",
  "Upgrade to Pro",
  "Pro로 업그레이드",
  "AI Recall & Insights, unlimited",
  "AI 기록 검색, 독서 인사이트 무제한",
  "Subscriptions are managed through your Apple ID.",
  "구독은 Apple ID를 통해 관리됩니다."
]) {
  requireCondition(!englishMessages.includes(staleCopy) && !koreanMessages.includes(staleCopy), "stale product copy remains: " + staleCopy);
}
requireIncludes(subscriptionPage, "subscription route", [
  "data-route-state=\"disabled\"",
  "data-subscription-enabled=\"false\""
]);
requireIncludes(adminProxy, "admin proxy", ["isAdminEmail", "const isLoginPage = request.nextUrl.pathname === \"/login\"", "url.pathname = \"/login\""]);
requireIncludes(adminAuth, "server admin guard", ["requireAdminUser", "isAdminEmail"]);
requireIncludes(adminAuthPublicApi, "server admin auth entrypoint", ["requireAdminUser"]);
requireIncludes(adminDashboardRoute, "admin root route", ["@/_pages/admin-dashboard"]);
requireIncludes(adminLoginRoute, "admin login route", ["@/_pages/admin-login"]);
requireIncludes(adminEmail, "admin allow-list", ["adminEmails", "new Set", "isAdminEmail"]);
const adminRouteFiles = [
  ...collectAdminHandlerFiles(path.join(adminRoot, "src", "_app", "api-routes", "admin-push")),
  ...collectAdminHandlerFiles(path.join(adminRoot, "src", "_app", "api-routes", "admin-users")),
];
requireCondition(adminRouteFiles.length > 0, "no admin API handler files found");
for (const routeFile of adminRouteFiles) {
  requireIncludes(readText(routeFile), path.relative(repositoryRoot, routeFile), ["requireAdminUser"]);
}
requireIncludes(supabaseConfig, "Supabase config", [
  "max_rows = 1000",
  "enable_refresh_token_rotation = true",
  "enable_anonymous_sign_ins = false"
]);
requireIncludes(edgeContract, "Edge consumer contract", [
  "WEB_ALLOWED_ORIGINS",
  "Access-Control-Allow-Origin",
  "auth.getUser",
  "createServiceClient",
  "SUPABASE_SERVICE_ROLE_KEY"
]);
const migrationDirectory = path.join(repositoryRoot, "supabase", "migrations");
const migrationNames = fs.existsSync(migrationDirectory)
  ? fs.readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql"))
  : [];
requireCondition(migrationNames.length > 0, "Supabase migrations are missing");
for (const migrationName of migrationNames) {
  requireCondition(/^[0-9]{8}([0-9]{6})?_[a-z0-9_]+\.sql$/.test(migrationName), "migration filename is not ordered and machine-checkable: " + migrationName);
}
requireCondition([...migrationNames].sort().join("\n") === migrationNames.slice().sort().join("\n"), "migration list could not be sorted deterministically");
for (const command of config.supabase?.migrationOrder ?? []) {
  requireCondition(runbook.includes(command), "runbook is missing migration command: " + command);
}
requireIncludes(routeSpec, "consumer route checks", [
  "await expect(page).toHaveTitle(/Bookgolas/)",
  "await expect(page).toHaveTitle(/북골라스/)"
]);
requireIncludes(runbook, "release runbook", [
  "PREVIEW_ORIGIN",
  "OPTIONS",
  "auth.getUser",
  "webBilling=false",
  "Plan: .omo/plans/bookgolas-web-app-parity.md"
]);
requireCondition(runbook.toLowerCase().includes("do not deploy production"), "release runbook must prohibit Production deployment");
requireCondition(config.shippedWebClaims?.subscription?.enabled === false, "Web subscription must remain disabled");
requireCondition(config.shippedWebClaims?.offline?.supported === false, "Web offline claim must remain unsupported");
for (const capability of [
  "ios-home-widget",
  "siri-app-shortcuts",
  "native-push",
  "camera-and-ocr",
  "share-sheet",
  "revenuecat-subscriptions"
]) {
  requireCondition(config.shippedWebClaims?.nativeOnly?.includes(capability), "native-only capability is missing: " + capability);
}
requireCondition(negativeFixture.issue === 448 && negativeFixture.task === 36, "negative fixture metadata is incorrect");
const missingEnvFixture = negativeFixture.fixtures?.["missing-required-env"];
requireCondition(missingEnvFixture?.environment === "preview", "negative fixture must use Preview");
requireCondition(missingEnvFixture?.missing === "NEXT_PUBLIC_SUPABASE_ANON_KEY", "negative fixture must remove the anon key");
requireCondition(missingEnvFixture?.expectedExit === 1, "negative fixture must expect exit 1");
requireCondition(missingEnvFixture?.phase === "before-next-build", "negative fixture must run before the Next build");
requireCondition(missingGateFixture?.script === "test:contracts", "missing-gate-command fixture must target the contract aggregate");
requireCondition(configuredContractScripts.includes(missingGateFixture?.missing), "missing-gate-command fixture must remove a required command");
requireCondition(missingGateFixture?.expectedExit === 1, "missing-gate-command fixture must expect exit 1");
requireCondition(missingGateFixture?.phase === "before-ci-execution", "missing-gate-command fixture must run before CI execution");

const requiredEnvironment = config.completionPreflight?.preview?.requiredEnvironment ?? [];
requireCondition(requiredEnvironment.length === 4, "completion required environment must contain exactly four variables");

if (fixtureName === "missing-required-env") {
  const fixtureEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: "https://preview.supabase.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "preview-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "preview-service-role-key",
    WEB_ALLOWED_ORIGINS: "https://preview.example.invalid"
  };
  delete fixtureEnvironment[missingEnvFixture?.missing ?? "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const missing = requiredEnvironment.filter((name) => !fixtureEnvironment[name]);
  requireCondition(missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "missing-required-env did not remove the expected variable");
  if (missing.length === 0) failures.push("missing-required-env unexpectedly passed");
}

if (environmentName === "preview" || environmentName === "production") {
  const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim());
  requireCondition(missing.length === 0, environmentName + " release environment is missing: " + missing.join(", "));
  const placeholders = requiredEnvironment.filter((name) => /^(REQUIRED_|CHANGE_ME|example|placeholder)/i.test(process.env[name]?.trim() ?? ""));
  requireCondition(placeholders.length === 0, environmentName + " release environment uses placeholders: " + placeholders.join(", "));
  const origin = process.env.WEB_ALLOWED_ORIGINS ?? "";
  requireCondition(origin.length > 0, environmentName + " release environment is missing WEB_ALLOWED_ORIGINS");
  requireCondition(!origin.includes("localhost"), environmentName + " hosted environment must not use localhost as an allowed origin");
}

if (fixtureName && !["missing-required-env", "missing-gate-command"].includes(fixtureName)) {
  failures.push("unknown release config fixture: " + fixtureName);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

if (fixtureName === "missing-required-env") {
  console.error("release config fixture rejected before next build: missing_required_environment=NEXT_PUBLIC_SUPABASE_ANON_KEY values_disclosed=false");
  process.exit(1);
}

console.log(`consumer web release config passed: required_environment=${requiredEnvironment.join(",")} fixture_scope=${completionPreflight.fixtureReset.scope} supabase_cli=${completionPreflight.fixtureReset.supabaseCli} secrets_disclosed=false`);
