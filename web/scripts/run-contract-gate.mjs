import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(webRoot, "docs", "consumer-web-release-config.json"), "utf8"),
);
const contractScripts = config.verification?.contractScripts ?? [];
const intentionalFailureScripts = new Set(
  config.verification?.intentionalFailureScripts ?? [],
);
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const failures = [];

for (const scriptName of contractScripts) {
  console.log(`\n=== contract gate: npm run ${scriptName} ===`);
  const result = spawnSync(npmExecutable, ["run", scriptName], {
    cwd: webRoot,
    env: process.env,
    stdio: "inherit",
  });
  const expectedStatus = intentionalFailureScripts.has(scriptName) ? 1 : 0;
  if (result.error) {
    failures.push(`${scriptName}: could not start (${result.error.message})`);
  } else if (result.signal) {
    failures.push(`${scriptName}: terminated by ${result.signal}`);
  } else if (result.status !== expectedStatus) {
    failures.push(
      `${scriptName}: expected exit ${expectedStatus}, received ${String(result.status)}`,
    );
  }
}

if (failures.length > 0) {
  console.error("\nconsumer contract gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `\nconsumer contract gate passed: commands=${contractScripts.length} intentional_failures=${intentionalFailureScripts.size}`,
);
