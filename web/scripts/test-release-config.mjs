import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webRoot, "..");
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

function collectRouteFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectRouteFiles(entryPath));
    if (entry.isFile() && entry.name === "route.ts") files.push(entryPath);
  }
  return files;
}

const config = readJson(configPath);
const negativeFixture = readJson(negativeFixturePath);
const packageJson = readJson(packagePath);
const envExample = readText(path.join(webRoot, ".env.example"));
const rootLayout = readText(path.join(webRoot, "src", "app", "layout.tsx"));
const localizedLayout = readText(path.join(webRoot, "src", "app", "[locale]", "layout.tsx"));
const termsPage = readText(path.join(webRoot, "src", "app", "[locale]", "terms", "page.tsx"));
const supportPage = readText(path.join(webRoot, "src", "app", "[locale]", "support", "page.tsx"));
const privacyPage = readText(path.join(webRoot, "src", "app", "[locale]", "privacy", "page.tsx"));
const rootPrivacy = readText(path.join(webRoot, "src", "app", "privacy", "page.tsx"));
const rootTerms = readText(path.join(webRoot, "src", "app", "terms", "page.tsx"));
const rootSupport = readText(path.join(webRoot, "src", "app", "support", "page.tsx"));
const subscriptionPage = readText(path.join(webRoot, "src", "app", "[locale]", "(consumer)", "subscription", "page.tsx"));
const englishMessages = readText(path.join(webRoot, "messages", "en.json"));
const koreanMessages = readText(path.join(webRoot, "messages", "ko.json"));
const proxy = readText(path.join(webRoot, "src", "proxy.ts"));
const adminAuth = readText(path.join(webRoot, "src", "lib", "admin-auth.ts"));
const serverAuth = readText(path.join(webRoot, "src", "lib", "supabase-server.ts"));
const supabaseConfig = readText(path.join(repositoryRoot, "supabase", "config.toml"));
const edgeContract = readText(path.join(repositoryRoot, "supabase", "functions", "_shared", "consumer-contract.ts"));
const routeSpec = readText(path.join(webRoot, "tests", "e2e", "routes.spec.ts"));
const runbook = readText(path.join(webRoot, "docs", "consumer-web-release-runbook.md"));

requireCondition(config.schemaVersion === 1, "release config schemaVersion must be 1");
requireCondition(config.issue === 448, "release config issue must be 448");
requireCondition(config.task === 36, "release config task must be 36");
requireCondition(config.parentIssue === 412, "release config parentIssue must be 412");
requireCondition(config.plan === ".omo/plans/bookgolas-web-app-parity.md", "release config plan footer is incorrect");
requireCondition(config.deliveryUnit === "web", "release config delivery unit must be web");
requireCondition(config.targetVersion === "1.1.0", "release config target version must be 1.1.0");
requireCondition(config.targetBranch === "version/web/1.1.0", "release config target branch is incorrect");
requireCondition(config.featureBranch === "codex/feature/web/1.1.0/BOK-448-release-readiness", "release config feature branch is incorrect");
requireCondition(config.nextVersion === "16.3.0-preview.8", "release config Next version is stale");
requireCondition(config.nodeVersion === "22", "release config Node version must be 22");
requireCondition(config.runtime?.buildCommand === "npm run build", "runtime build command is incorrect");
requireCondition(config.runtime?.buildGate === "npm run test:release-config", "runtime build gate is missing");
requireCondition(config.runtime?.fixtureServer === "loopback-only", "fixture server must be loopback-only");
requireCondition(packageJson.dependencies?.next === config.nextVersion, "package Next version does not match release config");
requireCondition(packageJson.scripts?.build === "npm run test:release-config && next build", "build must run release config before next build");
requireCondition(packageJson.scripts?.["test:release-config"] === "node scripts/test-release-config.mjs", "positive release config script is missing");
requireCondition(packageJson.scripts?.["test:release-config:negative"] === "node scripts/test-release-config.mjs --fixture missing-required-env", "negative release config script is missing");
requireCondition(packageJson.scripts?.test?.startsWith("npm run test:release-config &&"), "full test must include release config gate");
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
requireIncludes(proxy, "admin proxy", ["isAdminEmail", "if (!user)", "url.pathname = \"/admin/login\""]);
requireIncludes(adminAuth, "admin allow-list", ["ADMIN_EMAILS", "new Set"]);
requireIncludes(serverAuth, "server admin guard", ["requireAdminUser", "isAdminEmail"]);
const adminRouteFiles = collectRouteFiles(path.join(webRoot, "src", "app", "api", "admin"));
requireCondition(adminRouteFiles.length > 0, "no admin API route files found");
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
requireIncludes(routeSpec, "existing route checks", [
  "await expect(page).toHaveTitle(/Bookgolas/)",
  "await expect(page).toHaveTitle(/북골라스/)",
  "expect(new URL(page.url()).pathname).toBe(\"/admin/login\")",
  "Bookgolas Admin"
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

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];
const args = process.argv.slice(2);
const fixtureIndex = args.indexOf("--fixture");
const fixtureName = fixtureIndex >= 0 ? args[fixtureIndex + 1] : "";
const environmentIndex = args.indexOf("--environment");
const environmentName = environmentIndex >= 0 ? args[environmentIndex + 1] : "";

if (fixtureName === "missing-required-env") {
  const fixtureEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: "https://preview.supabase.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "preview-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "preview-service-role-key"
  };
  delete fixtureEnvironment[missingEnvFixture?.missing ?? "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const missing = requiredEnvironment.filter((name) => !fixtureEnvironment[name]);
  requireCondition(missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "missing-required-env did not remove the expected variable");
  if (missing.length === 0) failures.push("missing-required-env unexpectedly passed");
}

if (environmentName === "preview" || environmentName === "production") {
  const missing = requiredEnvironment.filter((name) => !process.env[name]);
  requireCondition(missing.length === 0, environmentName + " release environment is missing: " + missing.join(", "));
  const origin = process.env.WEB_ALLOWED_ORIGINS ?? "";
  requireCondition(origin.length > 0, environmentName + " release environment is missing WEB_ALLOWED_ORIGINS");
  requireCondition(!origin.includes("localhost"), environmentName + " hosted environment must not use localhost as an allowed origin");
}

if (fixtureName && fixtureName !== "missing-required-env") {
  failures.push("unknown release config fixture: " + fixtureName);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

if (fixtureName === "missing-required-env") {
  console.error("release config fixture rejected the missing required environment before next build");
  process.exit(1);
}

console.log("consumer web release config passed");
