import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/book-discovery-contract.json"),
  fixture: path.join(root, "scripts/fixtures/book-discovery-negative.json"),
  manifest: path.join(root, "package.json"),
  page: path.join(root, "src/app/[locale]/(consumer)/books/new/page.tsx"),
  client: path.join(root, "src/components/consumer/book-discovery-client.tsx"),
  api: path.join(root, "src/app/api/consumer/book-discovery/route.ts"),
  isbn: path.join(root, "src/lib/consumer/isbn.ts"),
  fixtures: path.join(root, "src/lib/consumer/book-discovery-fixtures.ts"),
  contractSource: path.join(root, "src/lib/product/contracts/book-discovery.ts"),
  adapter: path.join(root, "src/lib/product/adapters/book-search.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  e2e: path.join(root, "tests/e2e/book-discovery.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing book-discovery ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) {
    requireCondition(fs.statSync(filePath).size > 0, `empty book-discovery ${name}: ${path.relative(root, filePath)}`);
  }
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(
    Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]),
  );

  requireCondition(contract.issue === 428, "book-discovery contract must bind issue 428");
  requireCondition(Array.isArray(fixture.fixtures) && fixture.fixtures.length >= 3, "book-discovery negative fixture must cover the three security boundaries");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "book-discovery contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.actions) === JSON.stringify(["search", "recommendations"]), "book-discovery actions must preserve search and recommendation entry");
  requireCondition(JSON.stringify(contract.searchModes) === JSON.stringify(["text", "isbn"]), "book-discovery must distinguish text and ISBN search");
  for (const locale of ["ko", "en"]) requireCondition(contract.locales.includes(locale), `book-discovery must cover ${locale}`);
  for (const state of ["loading", "empty", "invalid", "upstream", "unauthorized", "consent", "quota", "offline", "camera-unsupported", "camera-insecure", "camera-denied", "file-fallback", "manual-fallback"]) {
    requireCondition(contract.states.includes(state), `book-discovery must cover ${state}`);
  }
  requireCondition(manifest.scripts["test:book-discovery"] === "node scripts/test-book-discovery.mjs && vitest run src/lib/consumer/isbn.test.ts src/lib/product/contracts/book-discovery.test.ts src/lib/product/adapters.book-search.test.ts src/app/api/consumer/book-discovery/route.test.ts", "package must expose the exact book-discovery acceptance command");
  requireCondition(manifest.scripts["test:book-discovery:negative"] === "node scripts/test-book-discovery.mjs --fixture provider-secret-leak", "package must expose the book-discovery negative command");
  requireCondition(source.page.includes("BookDiscoveryClient") && source.page.includes("ConsumerHeader"), "new-book route must render the authenticated discovery client");
  requireCondition(source.client.includes("AbortController") && source.client.includes("isValidIsbn13"), "discovery client must cancel stale searches and validate ISBN-13");
  requireCondition(source.client.includes("getUserMedia") && source.client.includes("BarcodeDetector"), "discovery client must implement the browser scanner capability path");
  requireCondition(source.client.includes('accept="image/*"') && source.client.includes("manual-fallback") && source.client.includes("file-fallback"), "camera failures must preserve manual and image/file fallbacks");
  requireCondition(source.client.includes("recommendations") && source.client.includes("data-testid=\"book-recommendation\""), "discovery client must expose the native recommendation entry");
  requireCondition(source.api.includes("searchBooks") && source.api.includes("recommendNextBooks") && source.api.includes("productErrorResponse"), "book-discovery API must use the verified server adapters and typed errors");
  requireCondition(source.api.includes("user_id") && source.api.includes("userId"), "book-discovery API must reject caller-selected ownership fields");
  requireCondition(source.adapter.includes("sanitizeTrustedProviderUrl") && source.adapter.includes("trustedBookImageHosts") && source.adapter.includes("trustedBookLinkHosts"), "provider URLs must be sanitized against HTTPS allowlists");
  requireCondition(source.routeFixture.includes('"book-discovery-results"') && source.proxy.includes("book-discovery-"), "book-discovery fixtures must be allowlisted only at the loopback route boundary");
  requireCondition(source.e2e.includes("search") && source.e2e.includes("manual-isbn") && source.e2e.includes("unsupported") && source.e2e.includes("invalid") && source.e2e.includes("upstream"), "book-discovery E2E must include the issue-defined happy and failure invocations");
  requireCondition(source.ko.includes('"bookDiscovery"') && source.en.includes('"bookDiscovery"'), "book-discovery copy must be localized in Korean and English");

  const clientSurface = `${source.page}\n${source.client}\n${source.isbn}`;
  if (fixtureMode === "provider-secret-leak") {
    requireCondition(!/ALADIN_TTB_KEY|ttbkey|aladin\.co\.kr\/ttb\/api/i.test(clientSurface), "provider credentials or direct Aladin API calls leaked into client surface");
  }
  if (fixtureMode === "insecure-camera-only-path") {
    requireCondition(source.client.includes("manual-fallback") && source.client.includes("file-fallback") && source.client.includes('type="file"'), "scanner fallback fixture must preserve manual and file input");
  }
  if (fixtureMode === "untrusted-provider-url") {
    requireCondition(source.contractSource.includes("url.protocol !== \"https:\"") && source.contractSource.includes("hosts.includes(hostname)"), "untrusted provider URL fixture must be rejected by HTTPS host allowlist");
  }
}

if (failures.length > 0) {
  console.error(`book-discovery contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`book-discovery contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
