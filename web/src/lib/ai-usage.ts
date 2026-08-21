export const DEFAULT_AI_USAGE_DAYS = 7;
export const MAX_AI_USAGE_DAYS = 31;

const DAY_MS = 24 * 60 * 60 * 1000;

export type AiUsageLogRow = {
  function_name: string;
  latency_ms: number;
  status: "success" | "failure";
  estimated_cost_usd: number | string | null;
  created_at: string;
};

export type AiUsageMetric = {
  calls: number;
  successes: number;
  failures: number;
  failureRate: number;
  averageLatencyMs: number;
  estimatedCostUsd: number;
};

export type AiUsageSummary = {
  totals: AiUsageMetric;
  functions: Array<AiUsageMetric & { functionName: string }>;
  daily: Array<AiUsageMetric & { date: string }>;
};

export type AiUsageDateRange = {
  from: string;
  to: string;
  fromTimestamp: string;
  toExclusiveTimestamp: string;
};

type MutableMetric = {
  calls: number;
  successes: number;
  failures: number;
  totalLatencyMs: number;
  estimatedCostUsd: number;
};

function createMetric(): MutableMetric {
  return {
    calls: 0,
    successes: 0,
    failures: 0,
    totalLatencyMs: 0,
    estimatedCostUsd: 0,
  };
}

function round(value: number, fractionDigits: number): number {
  return Number(value.toFixed(fractionDigits));
}

function toPublicMetric(metric: MutableMetric): AiUsageMetric {
  return {
    calls: metric.calls,
    successes: metric.successes,
    failures: metric.failures,
    failureRate: metric.calls === 0 ? 0 : round((metric.failures / metric.calls) * 100, 1),
    averageLatencyMs: metric.calls === 0 ? 0 : round(metric.totalLatencyMs / metric.calls, 1),
    estimatedCostUsd: round(metric.estimatedCostUsd, 8),
  };
}

function addRow(metric: MutableMetric, row: AiUsageLogRow): void {
  const latencyMs = Number(row.latency_ms);
  const costUsd = Number(row.estimated_cost_usd ?? 0);
  metric.calls += 1;
  metric.successes += row.status === "success" ? 1 : 0;
  metric.failures += row.status === "failure" ? 1 : 0;
  metric.totalLatencyMs += Number.isFinite(latencyMs) && latencyMs >= 0 ? latencyMs : 0;
  metric.estimatedCostUsd += Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : 0;
}

function parseDateKey(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid_date_range");
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error("invalid_date_range");
  }
  return timestamp;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDefaultAiUsageRange(now = new Date()): { from: string; to: string } {
  const endTimestamp = Date.parse(`${dateKey(now)}T00:00:00.000Z`);
  const startTimestamp = endTimestamp - (DEFAULT_AI_USAGE_DAYS - 1) * DAY_MS;
  return {
    from: dateKey(new Date(startTimestamp)),
    to: dateKey(new Date(endTimestamp)),
  };
}

export function parseAiUsageDateRange(
  params: URLSearchParams,
  now = new Date()
): AiUsageDateRange {
  const defaults = getDefaultAiUsageRange(now);
  const from = params.get("from") || defaults.from;
  const to = params.get("to") || defaults.to;
  const fromTimestamp = parseDateKey(from);
  const toTimestamp = parseDateKey(to);
  const dayCount = Math.floor((toTimestamp - fromTimestamp) / DAY_MS) + 1;

  if (fromTimestamp > toTimestamp || dayCount > MAX_AI_USAGE_DAYS) {
    throw new Error("invalid_date_range");
  }

  return {
    from,
    to,
    fromTimestamp: new Date(fromTimestamp).toISOString(),
    toExclusiveTimestamp: new Date(toTimestamp + DAY_MS).toISOString(),
  };
}

export function aggregateAiUsage(rows: AiUsageLogRow[]): AiUsageSummary {
  const totals = createMetric();
  const byFunction = new Map<string, MutableMetric>();
  const byDate = new Map<string, MutableMetric>();

  for (const row of rows) {
    const functionName = row.function_name?.trim();
    const createdAt = new Date(row.created_at);
    if (!functionName || Number.isNaN(createdAt.getTime())) continue;

    if (row.status !== "success" && row.status !== "failure") continue;
    addRow(totals, row);

    const functionMetric = byFunction.get(functionName) ?? createMetric();
    addRow(functionMetric, row);
    byFunction.set(functionName, functionMetric);

    const day = dateKey(createdAt);
    const dayMetric = byDate.get(day) ?? createMetric();
    addRow(dayMetric, row);
    byDate.set(day, dayMetric);
  }

  return {
    totals: toPublicMetric(totals),
    functions: Array.from(byFunction.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([functionName, metric]) => ({ functionName, ...toPublicMetric(metric) })),
    daily: Array.from(byDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, metric]) => ({ date, ...toPublicMetric(metric) })),
  };
}
