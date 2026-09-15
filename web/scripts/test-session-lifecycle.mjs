import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/session-lifecycle-contract.json"),
  fixture: path.join(root, "scripts/fixtures/session-lifecycle-negative.json"),
  manifest: path.join(root, "package.json"),
  paths: path.join(root, "src/lib/consumer/paths.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  signIn: path.join(root, "src/app/[locale]/(auth)/auth/sign-in/page.tsx"),
  authForm: path.join(root, "src/components/consumer/auth-form.tsx"),
  signOut: path.join(root, "src/components/consumer/sign-out-button.tsx"),
  consumerLayout: path.join(root, "src/app/[locale]/(consumer)/layout.tsx"),
  bookPage: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/page.tsx"),
  bookLoading: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/loading.tsx"),
  bookError: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/error.tsx"),
  readingLoading: path.join(root, "src/app/[locale]/(consumer)/reading/[bookId]/loading.tsx"),
  readingError: path.join(root, "src/app/[locale]/(consumer)/reading/[bookId]/error.tsx"),
  e2e: path.join(root, "tests/e2e/session-lifecycle.spec.ts"),
};
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing session lifecycle ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) {
    requireCondition(fs.statSync(filePath).size > 0, `empty session lifecycle ${name}: ${path.relative(root, filePath)}`);
  }
}

const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
const source = Object.fromEntries(
  Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]),
);

requireCondition(contract.issue === 427, "session lifecycle contract must bind issue 427");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "session lifecycle contract must reference the parity plan");
requireCondition(contract.redirect.parameter === "returnTo", "session handoff must use returnTo");
requireCondition(contract.redirect.singleRedirect === true, "session handoff must be single redirect");
requireCondition(contract.states.includes("expired-session") && contract.states.includes("invalid-session"), "session contract must cover expired and invalid sessions");
requireCondition(contract.states.includes("foreign-book") && contract.states.includes("deleted-book"), "session contract must cover foreign and deleted books");
requireCondition(contract.states.includes("network-loss") && contract.states.includes("logout-from-deep-link"), "session contract must cover network loss and deep-link logout");
requireCondition(manifest.scripts["test:session-lifecycle"] === "node scripts/test-session-lifecycle.mjs && vitest run src/lib/consumer/session-lifecycle.test.ts src/lib/consumer/paths.test.ts src/proxy.test.ts", "package must expose the exact session lifecycle acceptance command");
requireCondition(manifest.scripts["test:session-lifecycle:negative"] === "node scripts/test-session-lifecycle.mjs --fixture unsafe-return", "package must expose the session lifecycle negative command");
requireCondition(source.paths.includes("export function getConsumerSignInRedirectPath") && source.paths.includes("getSafeNextPath"), "return target must be normalized by the shared path boundary");
requireCondition(source.proxy.includes("getConsumerSignInRedirectPath") && source.proxy.includes("hasVerifiedClaims = false"), "proxy must fail closed and use the shared login handoff");
requireCondition(source.routeFixture.includes('"expired-session"') && source.routeFixture.includes('"invalid-session"') && source.routeFixture.includes('"bootstrap-network"'), "route fixtures must cover expired, invalid and bootstrap network sessions");
requireCondition(source.queries.includes('.eq("user_id", context.user.id)') && source.queries.includes('.is("deleted_at", null)'), "book reads must remain owner scoped and exclude deleted rows");
requireCondition(source.signIn.includes("getSafeNextPath") && source.authForm.includes("window.location.assign(nextPath)"), "login must reload the allowlisted target");
requireCondition(source.signOut.includes("signOutUser") && source.signOut.includes("/auth/sign-in"), "deep-link logout must clear the session before entering sign-in");
requireCondition(source.consumerLayout.includes('data-route-state="unavailable"'), "bootstrap auth failure must expose an unavailable route state");
for (const name of ["bookLoading", "readingLoading"]) requireCondition(source[name].includes('data-route-state="pending"'), `${name} must expose pending route state`);
for (const name of ["bookError", "readingError"]) requireCondition(source[name].includes('data-route-state="error"'), `${name} must expose error route state`);
requireCondition(source.bookPage.includes('data-route-state={result.code === "unavailable" ? "unavailable" : "not-found-or-forbidden"}'), "book detail must keep one safe not-found policy");
requireCondition(source.e2e.includes("expired and invalid sessions") && source.e2e.includes("foreign book IDs") && source.e2e.includes("deleted books"), "browser failure coverage must name expired, foreign and deleted cases");
requireCondition(source.e2e.includes("return-to") && source.e2e.includes("Foreign private title") && source.e2e.includes("Deleted private title"), "browser coverage must assert return-to and private-data absence");
requireCondition(fixture.unsafeReturnTargets.length >= 5, "negative fixture must cover five unsafe return targets");
requireCondition(fixture.privateDataMarkers.length === 2 && fixture.unauthenticatedNetworkMarkers.length === 3, "negative fixture must cover HTML and network private-data markers");

if (fixtureMode === "unsafe-return") {
  requireCondition(fixture.expectedFallback.path === "/ko/home", "unsafe return fixture fallback must be the localized home");
  requireCondition(fixture.unsafeReturnTargets.every((target) => typeof target === "string" && target.length > 0), "unsafe return fixture contains an empty target");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  fixtureMode === "unsafe-return"
    ? `session lifecycle negative fixture passed: ${fixture.unsafeReturnTargets.length} unsafe targets rejected by the shared boundary`
    : "session lifecycle contract passed: fail-closed auth, safe return-to, owner-scoped not-found and aligned route states",
);
