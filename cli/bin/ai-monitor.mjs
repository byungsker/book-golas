import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { aggregateReport, filterEvents, normalizeEvents } from "../../ai-monitor/src/core.mjs";

const COMMANDS = new Set(["summary", "usage", "errors", "costs"]);
const FILTER_OPTIONS = new Set(["from", "to", "provider", "model", "status", "outcome", "error-type"]);
const FORMATS = new Set(["json", "csv"]);
const GROUPS = new Set(["provider", "model", "feature"]);
const FIXTURE = new URL("../../ai-monitor/fixtures/events.json", import.meta.url);
const SUMMARY_HEADERS = [
  "requests", "successes", "failures", "cancellations", "inputTokens", "outputTokens",
  "totalTokens", "latencyMs", "averageLatencyMs", "p95LatencyMs", "ttftMs",
  "averageTtftMs", "p95TtftMs", "costUsd", "errorRate",
];
const USAGE_HEADERS = [
  "eventId", "timestamp", "provider", "model", "feature", "status", "outcome", "inputTokens",
  "outputTokens", "totalTokens", "latencyMs", "ttftMs", "costUsd", "retryCount", "errorType",
  "errorCode", "traceId", "correlationId", "spanId", "pricingVersion",
];
const ERROR_HEADERS = [
  "eventId", "timestamp", "provider", "model", "outcome", "errorType", "errorCode", "traceId",
  "correlationId",
];
const COST_HEADERS = [
  "groupBy", "key", "requests", "inputTokens", "outputTokens", "totalTokens", "latencyMs",
  "ttftMs", "costUsd", "errors", "cancellations", "errorRate",
];

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliError";
  }
}

function parseDate(value, option) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CliError(`Invalid --${option} date`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new CliError(`Invalid --${option} date`);
  }
  return date;
}

function parseArguments(argv) {
  const [command, ...tokens] = argv;
  if (!COMMANDS.has(command)) throw new CliError("Unknown command");
  const values = new Map();
  for (let index = 0; index < tokens.length; index += 2) {
    const token = tokens[index];
    const value = tokens[index + 1];
    if (!token?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new CliError("Invalid argument");
    }
    const option = token.slice(2);
    const supported = FILTER_OPTIONS.has(option) || option === "format" ||
      (command === "errors" && option === "since") || (command === "costs" && option === "group-by");
    if (!supported || values.has(option)) throw new CliError("Unsupported filter");
    values.set(option, value);
  }
  const format = values.get("format") ?? "json";
  if (!FORMATS.has(format)) throw new CliError("Unsupported format");
  const groupBy = values.get("group-by") ?? "provider";
  if (command === "costs" && !GROUPS.has(groupBy)) throw new CliError("Unsupported group");
  const since = values.get("since");
  if (since !== undefined && !/^[1-9]\d*h$/.test(since)) throw new CliError("Invalid --since value");
  return { command, values, format, groupBy, since };
}

function buildFilters(values) {
  const filters = {};
  const from = values.get("from");
  if (from !== undefined) filters.from = parseDate(from, "from").toISOString();
  const to = values.get("to");
  if (to !== undefined) {
    const exclusive = parseDate(to, "to");
    exclusive.setUTCDate(exclusive.getUTCDate() + 1);
    filters.to = exclusive.toISOString();
  }
  for (const option of ["provider", "model", "status", "outcome", "error-type"]) {
    const value = values.get(option);
    if (value !== undefined) filters[option === "error-type" ? "errorType" : option] = value;
  }
  return filters;
}

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, headers) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")).join("\n")}\n`;
}

function costRows(events, groupBy) {
  return [...new Set(events.map((event) => event[groupBy]))].sort().map((key) => {
    const totals = aggregateReport(events.filter((event) => event[groupBy] === key)).totals;
    return {
      groupBy,
      key,
      requests: totals.requests,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      totalTokens: totals.totalTokens,
      latencyMs: totals.latencyMs,
      ttftMs: totals.ttftMs,
      costUsd: totals.costUsd,
      errors: totals.failures,
      cancellations: totals.cancellations,
      errorRate: totals.errorRate,
    };
  });
}

function commandOutput(parsed, events) {
  if (events.length === 0) throw new CliError("No matching events");
  if (parsed.command === "summary") {
    const report = aggregateReport(events);
    return { value: report, rows: [report.totals], headers: SUMMARY_HEADERS };
  }
  if (parsed.command === "usage") return { value: events, rows: events, headers: USAGE_HEADERS };
  if (parsed.command === "costs") {
    const rows = costRows(events, parsed.groupBy);
    return { value: rows, rows, headers: COST_HEADERS };
  }
  let failures = events.filter((event) => event.status === "failure");
  if (parsed.since !== undefined && failures.length > 0) {
    const latest = Math.max(...failures.map((event) => Date.parse(event.timestamp)));
    const hours = Number.parseInt(parsed.since, 10);
    failures = failures.filter((event) => Date.parse(event.timestamp) >= latest - hours * 60 * 60 * 1000);
  }
  if (failures.length === 0) throw new CliError("No matching errors");
  const rows = aggregateReport(failures, { recentErrorsLimit: failures.length }).recentErrors;
  return { value: rows, rows, headers: ERROR_HEADERS };
}

async function loadFixture() {
  let text;
  try {
    text = await readFile(FIXTURE, "utf8");
  } catch (error) {
    if (error instanceof Error) throw new CliError("Unable to read fixture");
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) throw new CliError("Malformed fixture");
    throw error;
  }
}

export async function runCli(options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  try {
    const parsed = parseArguments(argv);
    const rawEvents = options.rawEvents ?? await loadFixture();
    const events = filterEvents(normalizeEvents(rawEvents), buildFilters(parsed.values));
    const output = commandOutput(parsed, events);
    stdout.write(parsed.format === "json" ? `${JSON.stringify(output.value)}\n` : toCsv(output.rows, output.headers));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected failure";
    stderr.write(`ai-monitor: ${message}\n`);
    return 2;
  }
}

const invokedPath = process.argv[1] === undefined ? "" : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) process.exitCode = await runCli();
