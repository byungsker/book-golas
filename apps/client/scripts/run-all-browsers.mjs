import { spawnSync } from "node:child_process";
import process from "node:process";

const npmExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
const projects = ["chromium", "firefox", "webkit"];

for (const project of projects) {
  let passed = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log(`\n=== all-browser gate: ${project} attempt ${attempt}/2 ===`);
    const result = spawnSync(
      npmExecutable,
      ["playwright", "test", `--project=${project}`, "--workers=1", "--retries=0"],
      { env: process.env, stdio: "inherit" },
    );

    if (!result.error && !result.signal && result.status === 0) {
      passed = true;
      break;
    }

    const outcome = result.error?.message ?? result.signal ?? `exit ${String(result.status)}`;
    console.error(`all-browser gate: ${project} attempt ${attempt} failed (${outcome})`);
  }

  if (!passed) {
    console.error(`all-browser gate failed closed: ${project} failed both fresh-process attempts`);
    process.exit(1);
  }
}

console.log("\nall-browser gate passed: chromium firefox webkit");
