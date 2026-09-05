import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function text(path) {
  return readFile(resolve(root, path), "utf8");
}

function requireMarker(source, marker, name) {
  assert.ok(source.includes(marker), `${name} is missing ${marker}`);
}

function runCli(command) {
  const result = spawnSync(process.execPath, [resolve(root, "cli/bin/ai-monitor.mjs"), command, "--format", "json"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${command} failed: ${result.stderr.trim()}`);
  assert.equal(result.stderr, "", `${command} wrote stderr`);
  return JSON.parse(result.stdout);
}

try {
  const [rawFixture, guide, cliReadme, webReadme, route] = await Promise.all([
    text("ai-monitor/fixtures/events.json"),
    text("docs/guides/ai-monitoring-1.1.0.md"),
    text("cli/README.md"),
    text("web/README.md"),
    text("web/src/app/api/admin/ai-monitor/route.ts"),
  ]);
  const { aggregateReport, normalizeEvents } = await import(pathToFileURL(resolve(root, "ai-monitor/src/core.mjs")).href);
  const events = normalizeEvents(JSON.parse(rawFixture));
  const expected = aggregateReport(events);
  const summary = runCli("summary");
  const usage = runCli("usage");

  assert.deepEqual(summary, expected, "summary does not match core aggregation");
  assert.deepEqual(usage, events, "usage does not match normalized fixture events");

  for (const [name, source] of [["guide", guide], ["CLI README", cliReadme], ["web README", webReadme]]) {
    for (const marker of [
      "ai-monitor/fixtures/events.json",
      "ai-monitor/src/core.mjs",
      "/api/admin/ai-monitor",
      "schemaVersion",
      "pricingVersion",
      "demo:check",
    ]) requireMarker(source, marker, name);
  }

  for (const marker of ["requireAdminUser", "process.env.NODE_ENV !== \"development\"", "isLoopbackHost", "Cache-Control\": \"no-store"]) {
    requireMarker(route, marker, "web route");
  }
} catch (error) {
  process.stderr.write(`demo:check failed: ${error instanceof Error ? error.message : "unexpected error"}\n`);
  process.exitCode = 1;
}
