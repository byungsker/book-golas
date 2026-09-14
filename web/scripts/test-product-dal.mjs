import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const consumerApiDirectory = path.resolve(scriptDirectory, "../src/app/api/app");
const forbiddenConsumerImports = /\bsupabase-admin\b|SUPABASE_SERVICE_ROLE_KEY/;

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

const forbiddenFiles = collectSourceFiles(consumerApiDirectory).filter((file) =>
  forbiddenConsumerImports.test(fs.readFileSync(file, "utf8")),
);
if (forbiddenFiles.length > 0) {
  console.error("consumer handlers must not import the admin service-role client:");
  for (const file of forbiddenFiles) console.error("- " + file);
  process.exit(1);
}

const forwardedArgs = [];
const inputArgs = process.argv.slice(2);
for (let index = 0; index < inputArgs.length; index += 1) {
  const argument = inputArgs[index];
  if (argument === "--grep") {
    const pattern = inputArgs[index + 1];
    if (!pattern) {
      console.error("--grep requires a test name pattern");
      process.exit(1);
    }
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
    "src/lib/product/dal.test.ts",
    "src/lib/product/dal.writes.test.ts",
    "src/app/api/app/books",
    ...forwardedArgs,
  ],
  { stdio: "inherit" },
);
if (result.error) {
  console.error("product DAL test runner could not start: " + result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
