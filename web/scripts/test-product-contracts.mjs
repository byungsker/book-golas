import { spawnSync } from "node:child_process";
import process from "node:process";

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
  ["run", "src/lib/product/contracts", ...forwardedArgs],
  { stdio: "inherit" },
);
if (result.error) {
  console.error(`product contract test runner could not start: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
