import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const contractPath = path.join(root, "docs/auth-email-contract.json");
const fixturePath = path.join(root, "scripts/fixtures/auth-email-negative.json");
const packagePath = path.join(root, "package.json");
const authFormPath = path.join(root, "src/features/auth/ui/AuthForm.tsx");
const signInRoutePath = path.join(root, "app/[locale]/(auth)/auth/sign-in/page.tsx");
const signInPagePath = path.join(root, "src/_pages/sign-in/ui/SignInPage.tsx");
const signInEntryPath = path.join(root, "src/_pages/sign-in/index.server.ts");

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

for (const filePath of [contractPath, fixturePath, packagePath, authFormPath, signInRoutePath, signInPagePath, signInEntryPath]) {
  requireCondition(fs.existsSync(filePath), `missing auth-email contract file: ${path.relative(root, filePath)}`);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const authForm = fs.readFileSync(authFormPath, "utf8");
const signInPage = fs.readFileSync(signInPagePath, "utf8");
const signInRoute = fs.readFileSync(signInRoutePath, "utf8");
const signInEntry = fs.readFileSync(signInEntryPath, "utf8");

requireCondition(contract.issue === 423, "contract must bind GitHub issue 423");
requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "contract must cover ko and en");
requireCondition(contract.passwordMinimum === 6, "contract must match the native six-character password minimum");
requireCondition(contract.resendCooldownSeconds === 60, "contract must require the native resend cooldown");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "contract must reference the parity plan");
requireCondition(manifest.scripts["test:auth-email"]?.includes("scripts/test-auth-email.mjs"), "package script must run the auth-email contract");

for (const operation of ["signInWithPassword", ".auth.signUp", ".auth.resetPasswordForEmail", ".auth.updateUser", ".auth.resend"]) {
  requireCondition(authForm.includes(operation), `auth form must use Supabase Auth operation: ${operation}`);
}

for (const feature of ["nickname-required", "saved-email-opt-in", "email-unconfirmed-resend", "safe-session-redirect", "browser-and-server-sign-out"]) {
  requireCondition(contract.features.includes(feature), `contract is missing feature: ${feature}`);
}

for (const rule of ["no-password-storage", "non-enumerating-signup-and-recovery", "localized-protected-return-targets"]) {
  requireCondition(contract.security.includes(rule), `contract is missing security rule: ${rule}`);
}

requireCondition(signInPage.includes("getSafeNextPath"), "sign-in must resolve return targets on the server");
requireCondition(!signInPage.includes("query.next"), "sign-in must reject the legacy raw next alias");
requireCondition(authForm.includes("pendingRef.current"), "auth actions must synchronously reject duplicate submissions");
requireCondition(authForm.includes("window.navigator.onLine") && authForm.includes('tConsumer("network.offline")'), "auth actions must expose localized offline feedback");
requireCondition(fixture.unsafeReturnTargets.length >= 5, "negative fixture must cover unsafe return targets");
requireCondition(fixture.accountExistenceMessages.length >= 3, "negative fixture must cover provider enumeration messages");
requireCondition(!authForm.includes("localStorage.setItem") || !authForm.includes("localStorage.setItem(\"password"), "auth form must not store passwords");

if (fixtureMode === "unsafe-return") {
  const { getSafeNextPath } = await import(pathToFileURL(path.join(root, "src/lib/consumer/paths.ts")).href);
  const acceptedTargets = fixture.unsafeReturnTargets.filter(
    (target) => getSafeNextPath("ko", target) !== "/ko/home",
  );
  if (acceptedTargets.length === 0) {
    console.error(`auth-email unsafe-return fixture rejected: ${fixture.unsafeReturnTargets.length} targets`);
    process.exit(1);
  }
  console.log(`auth-email unsafe-return fixture unexpectedly accepted: ${acceptedTargets.join(",")}`);
  process.exit(0);
}

console.log("auth-email contract: PASS");
