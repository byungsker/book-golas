import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const contractPath = path.join(root, "docs/auth-oauth-contract.json");
const fixturePath = path.join(root, "scripts/fixtures/auth-oauth-negative.json");
const packagePath = path.join(root, "package.json");
const authFormPath = path.join(root, "src/features/auth/ui/AuthForm.tsx");
const callbackPath = path.join(root, "app/[locale]/(auth)/auth/callback/route.ts");

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

for (const filePath of [contractPath, fixturePath, packagePath, authFormPath, callbackPath]) {
  requireCondition(fs.existsSync(filePath), `missing auth-oauth contract file: ${path.relative(root, filePath)}`);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const authForm = fs.readFileSync(authFormPath, "utf8");
const callback = fs.readFileSync(callbackPath, "utf8");

requireCondition(contract.issue === 424, "contract must bind GitHub issue 424");
requireCondition(JSON.stringify(contract.providers) === JSON.stringify(["google", "apple"]), "contract must expose only Google and Apple");
requireCondition(contract.flow === "pkce", "contract must require PKCE");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "contract must reference the parity plan");
requireCondition(manifest.scripts["test:auth-oauth"]?.includes("scripts/test-auth-oauth.mjs"), "package script must run the auth-oauth contract");
requireCondition(authForm.includes("signInWithOAuth"), "auth form must start Supabase OAuth");
requireCondition(!authForm.toLowerCase().includes("kakao"), "auth form must not render Kakao OAuth");
requireCondition(callback.includes("exchangeCodeForSession"), "callback must exchange the PKCE code for a session");
requireCondition(callback.includes('getAll("returnTo")') && !callback.includes('get("next")'), "callback must accept one canonical returnTo value only");
requireCondition(callback.includes('"oauth_provider", response'), "callback must keep provider configuration failures distinct from code failures");

for (const rule of ["reject-external-return-targets", "generic-callback-errors", "no-provider-error-detail-forwarding", "no-auth-code-forwarding"]) {
  requireCondition(contract.security.includes(rule), `contract is missing security rule: ${rule}`);
}

requireCondition(fixture.unsafeReturnTargets.length >= 5, "negative fixture must cover unsafe return targets");
requireCondition(fixture.providerFailures.length >= 2, "negative fixture must cover cancellation and provider failure");
requireCondition(fixture.invalidCodes.length >= 3, "negative fixture must cover missing, expired, and replayed codes");
requireCondition(!authForm.includes("client_secret"), "auth form must not expose an OAuth client secret");

if (fixtureMode === "unsafe-return") {
  const { getSafeNextPath } = await import(pathToFileURL(path.join(root, "src/lib/consumer/paths.ts")).href);
  const acceptedTargets = fixture.unsafeReturnTargets.filter(
    (target) => getSafeNextPath("ko", target) !== "/ko/home",
  );
  if (acceptedTargets.length === 0) {
    console.error(`auth-oauth unsafe-return fixture rejected: ${fixture.unsafeReturnTargets.length} targets`);
    process.exit(1);
  }
  console.log(`auth-oauth unsafe-return fixture unexpectedly accepted: ${acceptedTargets.join(",")}`);
  process.exit(0);
}

console.log("auth-oauth contract: PASS");
