import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(webDirectory, "src");
const fixturePath = path.join(scriptDirectory, "fixtures/function-adapters-negative.json");

function collectSourceFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(entryPath));
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
if (fixture.name !== "function-adapter-boundary-negative-fixtures" || !Array.isArray(fixture.cases)) {
  fail("function adapter negative fixture is malformed");
}
const fixtureCase = (name) => fixture.cases.find((entry) => entry.name === name);
const secretFixture = fixtureCase("browser-provider-secret");
const urlFixture = fixtureCase("browser-direct-provider-url");
const foreignPathFixture = fixtureCase("foreign-storage-object");
const traversalPathFixture = fixtureCase("traversal-storage-object");
if (!secretFixture || !urlFixture || !foreignPathFixture || !traversalPathFixture) {
  fail("function adapter negative fixture is missing a required case");
}

const browserFiles = [
  ...collectSourceFiles(path.join(sourceDirectory, "components")),
  ...collectSourceFiles(path.join(sourceDirectory, "app")),
];
const browserSources = browserFiles.map((file) => ({ file, source: fs.readFileSync(file, "utf8") }));
const secretPattern = new RegExp(secretFixture.pattern.replace("NAVER_CLIENT_SECRET", "NAVER_CLIENT_SECRET|NAVER_CLIENT_ID"));
const providerUrlPattern = new RegExp(urlFixture.pattern);

const leakedSecrets = browserSources.filter(({ source }) => secretPattern.test(source));
if (leakedSecrets.length > 0) {
  fail("browser-bound source contains a provider or service-role secret:\n" + leakedSecrets.map(({ file }) => `- ${file}`).join("\n"));
}

const directProviderCalls = browserSources.filter(({ source }) => providerUrlPattern.test(source));
if (directProviderCalls.length > 0) {
  fail("browser-bound source calls a provider directly:\n" + directProviderCalls.map(({ file }) => `- ${file}`).join("\n"));
}

const staticDirectory = path.join(webDirectory, ".next", "static");
const staticSources = collectSourceFiles(staticDirectory).map((file) => ({
  file,
  source: fs.readFileSync(file, "utf8"),
}));
const staticLeaks = staticSources.filter(({ source }) => secretPattern.test(source));
if (staticLeaks.length > 0) {
  fail("provider or service-role credentials reached the client build:\n" + staticLeaks.map(({ file }) => `- ${file}`).join("\n"));
}

function storageFixtureCode(entry) {
  const segments = entry.path.split("/");
  const fileName = segments.at(-1) ?? "";
  if (segments.length !== 3 || fileName.includes("..") || /\\|%2f|%2F/.test(entry.path)) return "validation_error";
  if (segments[0] !== entry.userId || segments[1] !== entry.bookId) return "forbidden";
  return "accepted";
}
if (storageFixtureCode(foreignPathFixture) !== foreignPathFixture.expectedCode) {
  fail("foreign storage negative fixture does not describe a forbidden path");
}
if (storageFixtureCode(traversalPathFixture) !== traversalPathFixture.expectedCode) {
  fail("traversal storage negative fixture does not describe a validation error");
}

const clientAdapterImports = browserSources.filter(({ source }) =>
  /^\s*["']use client["']/m.test(source) && /@\/lib\/product\/adapters/.test(source),
);
if (clientAdapterImports.length > 0) {
  fail("client components must call same-origin handlers instead of server-only adapters:\n" + clientAdapterImports.map(({ file }) => `- ${file}`).join("\n"));
}

const serverAdapterFiles = [
  "src/lib/product/adapters/book-search.ts",
  "src/lib/product/adapters/functions.ts",
  "src/lib/product/adapters/functions-adapters.ts",
  "src/lib/product/adapters/provider-config.ts",
  "src/lib/product/adapters/storage.ts",
  "src/lib/product/adapters/tables.ts",
];
for (const relativeFile of serverAdapterFiles) {
  const file = path.join(webDirectory, relativeFile);
  if (!fs.readFileSync(file, "utf8").startsWith('import "server-only"')) {
    fail(`${relativeFile} must be server-only`);
  }
}

const forwardedArgs = [];
const inputArgs = process.argv.slice(2);
for (let index = 0; index < inputArgs.length; index += 1) {
  const argument = inputArgs[index];
  if (argument === "--grep") {
    const pattern = inputArgs[index + 1];
    if (!pattern) fail("--grep requires a test name pattern");
    forwardedArgs.push("--testNamePattern", pattern);
    index += 1;
    continue;
  }
  if (argument.startsWith("--grep=")) {
    forwardedArgs.push("--testNamePattern", argument.slice("--grep=".length));
    continue;
  }
  forwardedArgs.push(argument);
}

const result = spawnSync(
  "vitest",
  [
    "run",
    "src/lib/product/adapters.test.ts",
    "src/lib/product/adapters.storage.test.ts",
    "src/lib/product/adapters.tables.test.ts",
    "src/app/api/app/books/search/route.test.ts",
    ...forwardedArgs,
  ],
  { cwd: webDirectory, stdio: "inherit" },
);
if (result.error) fail("function adapter test runner could not start: " + result.error.message);
process.exit(result.status ?? 1);
