import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { aggregateReport, filterEvents, normalizeEvents } from "../../ai-monitor/src/core.mjs";

const root = new URL("../../", import.meta.url);
const entry = new URL("../bin/ai-monitor.mjs", import.meta.url);
const rawEvents = JSON.parse(await readFile(new URL("../../ai-monitor/fixtures/events.json", import.meta.url), "utf8"));

function run(args) {
  return spawnSync(process.execPath, [entry.pathname, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
}

function parseCsv(value) {
  const lines = value.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(",")[index]])));
}

test("summary JSON matches aggregateReport with an inclusive UTC date range", () => {
  const result = run(["summary", "--from", "2026-09-01", "--to", "2026-09-02", "--format", "json"]);
  const expected = aggregateReport(filterEvents(normalizeEvents(rawEvents), {
    from: "2026-09-01T00:00:00.000Z",
    to: "2026-09-03T00:00:00.000Z",
  }));

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), expected);
  assert.equal(result.stderr, "");
});

test("summary filters provider, status, outcome, and error type", () => {
  const result = run([
    "summary", "--provider", "openai", "--status", "failure", "--outcome", "timeout",
    "--error-type", "timeout", "--format", "json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).totals.requests, 1);
});

test("summary CSV has stable aggregate headers", () => {
  const result = run(["summary", "--format", "csv"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.split("\n")[0], "requests,successes,failures,cancellations,inputTokens,outputTokens,totalTokens,latencyMs,averageLatencyMs,p95LatencyMs,ttftMs,averageTtftMs,p95TtftMs,costUsd,errorRate");
});

test("usage CSV exposes safe event fields for a model", () => {
  const result = run(["usage", "--model", "gpt-4o-mini", "--format", "csv"]);
  const rows = parseCsv(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.model), ["gpt-4o-mini", "gpt-4o-mini"]);
  assert.match(result.stdout.split("\n")[0], /provider,model,feature,status,outcome/);
  assert.match(result.stdout.split("\n")[0], /inputTokens,outputTokens,totalTokens,latencyMs,ttftMs,costUsd/);
  assert.match(result.stdout.split("\n")[0], /errorType,errorCode,traceId,correlationId,spanId/);
});

test("usage JSON contains only normalized events", async () => {
  const { runCli } = await import(entry);
  const streams = { stdout: "", stderr: "" };
  const sensitiveEvent = {
    ...rawEvents[0],
    prompt: "private prompt",
    response: "private response",
    user: "private user",
    authorization: "Bearer private",
    credential: "private credential",
    secret: "private secret",
  };
  const code = await runCli({
    argv: ["usage", "--format", "json"],
    rawEvents: [sensitiveEvent],
    stdout: { write(value) { streams.stdout += value; } },
    stderr: { write(value) { streams.stderr += value; } },
  });

  assert.equal(code, 0);
  assert.equal(JSON.parse(streams.stdout)[0].eventId, "evt-001");
  assert.doesNotMatch(streams.stdout, /private|prompt|response|user|authorization|credential|secret/i);
});

test("usage CSV escapes commas and quotes", async () => {
  const { runCli } = await import(entry);
  const streams = { stdout: "", stderr: "" };
  const code = await runCli({
    argv: ["usage", "--format", "csv"],
    rawEvents: [{ ...rawEvents[0], feature: "summary, \"quoted\"" }],
    stdout: { write(value) { streams.stdout += value; } },
    stderr: { write(value) { streams.stderr += value; } },
  });

  assert.equal(code, 0);
  assert.match(streams.stdout, /"summary, ""quoted"""/);
});

test("errors since 24h is deterministic and exposes report error fields", () => {
  const first = run(["errors", "--since", "24h", "--format", "json"]);
  const second = run(["errors", "--since", "24h", "--format", "json"]);
  const errors = JSON.parse(first.stdout);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.deepEqual(errors.map(({ eventId }) => eventId), ["evt-004", "evt-003"]);
  assert.deepEqual(Object.keys(errors[0]), ["eventId", "timestamp", "provider", "model", "outcome", "errorType", "errorCode", "traceId", "correlationId"]);
});

test("errors accepts provider and error-type filters", () => {
  const result = run(["errors", "--provider", "anthropic", "--error-type", "provider_error", "--format", "csv"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(parseCsv(result.stdout)[0].eventId, "evt-002");
});

test("costs groups by provider, model, and feature using aggregate totals", () => {
  for (const groupBy of ["provider", "model", "feature"]) {
    const result = run(["costs", "--group-by", groupBy, "--format", "json"]);
    const rows = JSON.parse(result.stdout);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(rows.reduce((sum, row) => sum + row.requests, 0), 5);
    assert.equal(rows.reduce((sum, row) => sum + row.costUsd, 0), aggregateReport(normalizeEvents(rawEvents)).totals.costUsd);
  }
});

test("costs applies model and status filters and emits stable CSV", () => {
  const result = run(["costs", "--group-by", "model", "--model", "gpt-4o-mini", "--status", "failure", "--format", "csv"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.split("\n")[0], "groupBy,key,requests,inputTokens,outputTokens,totalTokens,latencyMs,ttftMs,costUsd,errors,cancellations,errorRate");
  assert.equal(parseCsv(result.stdout)[0].requests, "1");
});

test("invalid dates, unsupported filters, empty results, and unknown commands fail on stderr", () => {
  const scenarios = [
    ["summary", "--from", "2026-02-30"],
    ["summary", "--prompt", "private"],
    ["usage", "--provider", "missing"],
    ["costs", "--group-by", "day"],
    ["unknown"],
  ];

  for (const args of scenarios) {
    const result = run(args);
    assert.notEqual(result.status, 0, args.join(" "));
    assert.equal(result.stdout, "");
    assert.notEqual(result.stderr, "");
  }
});

test("malformed fixture fails nonzero without leaking sensitive values", async () => {
  const { runCli } = await import(entry);
  const streams = { stdout: "", stderr: "" };
  const code = await runCli({
    argv: ["summary"],
    rawEvents: [{ prompt: "private prompt", authorization: "Bearer private" }],
    stdout: { write(value) { streams.stdout += value; } },
    stderr: { write(value) { streams.stderr += value; } },
  });

  assert.notEqual(code, 0);
  assert.equal(streams.stdout, "");
  assert.match(streams.stderr, /Invalid event field/);
  assert.doesNotMatch(streams.stderr, /private|prompt|authorization|Bearer/i);
});

test("entrypoint imports shared normalization, filtering, and aggregation without API clients", async () => {
  const source = await readFile(entry, "utf8");

  assert.match(source, /normalizeEvents/);
  assert.match(source, /filterEvents/);
  assert.match(source, /aggregateReport/);
  assert.doesNotMatch(source, /supabase|fetch\s*\(|https?:|authorization|credential|secret/i);
});
