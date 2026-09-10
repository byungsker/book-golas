import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitest = path.join(webRoot, "node_modules", ".bin", "vitest");
const requestedArgs = process.argv.slice(2);
const vitestArgs = [
  "run",
  "src/lib/auth-boundary.test.ts",
  "src/proxy.test.ts",
];
for (let index = 0; index < requestedArgs.length; index += 1) {
  const argument = requestedArgs[index];
  if (argument === "--grep") {
    vitestArgs.push("--testNamePattern", requestedArgs[index + 1] ?? "");
    index += 1;
  } else {
    vitestArgs.push(argument);
  }
}

const testResult = spawnSync(vitest, vitestArgs, {
  cwd: webRoot,
  encoding: "utf8",
  stdio: "inherit",
});
if (testResult.status !== 0) process.exit(testResult.status ?? 1);

const scanResult = spawnSync(process.execPath, ["scripts/check-auth-boundary.mjs"], {
  cwd: webRoot,
  encoding: "utf8",
  stdio: "inherit",
});
process.exit(scanResult.status ?? 1);
