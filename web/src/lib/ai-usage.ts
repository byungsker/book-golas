export const DEFAULT_AI_USAGE_DAYS = 7;
export const MAX_AI_USAGE_DAYS = 31;

export type AiOutcome = "success" | "failure" | "timeout" | "rate_limited" | "blocked";
export type AiHealthStatus = "healthy" | "warning" | "critical" | "unknown";

export type AiUsageHealthRow = {
  event_version: number | string;
  window_hours: number | string;
  status: AiHealthStatus;
  coverage_percent: number | string | null;
  allowed_reservations: number | string;
  terminal_events: number | string;
  missing_terminal_events: number | string;
  p95_latency_ms: number | string | null;
  log_count: number | string;
  control_event_count: number | string;
  failure_count: number | string;
  timeout_count: number | string;
  rate_limited_count: number | string;
  latest_event_at: string | null;
  sink_healthy: boolean;
};

export type AiUsageHealth = {
  eventVersion: number;
  windowHours: number;
  status: AiHealthStatus;
  coveragePercent: number | null;
  allowedReservations: number;
  terminalEvents: number;
  missingTerminalEvents: number;
  p95LatencyMs: number | null;
  logCount: number;
  controlEventCount: number;
  failureCount: number;
  timeoutCount: number;
  rateLimitedCount: number;
  latestEventAt: string | null;
  sinkHealthy: boolean;
};

export function toAiUsageHealth(row: AiUsageHealthRow): AiUsageHealth {
  const status: AiHealthStatus = ["healthy", "warning", "critical", "unknown"].includes(row.status)
    ? row.status
    : "unknown";
  const toNumber = (value: number | string): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const toNullableNumber = (value: number | string | null): number | null => {
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    eventVersion: toNumber(row.event_version),
    windowHours: toNumber(row.window_hours),
    status,
    coveragePercent: toNullableNumber(row.coverage_percent),
    allowedReservations: toNumber(row.allowed_reservations),
    terminalEvents: toNumber(row.terminal_events),
    missingTerminalEvents: toNumber(row.missing_terminal_events),
    p95LatencyMs: toNullableNumber(row.p95_latency_ms),
    logCount: toNumber(row.log_count),
    controlEventCount: toNumber(row.control_event_count),
    failureCount: toNumber(row.failure_count),
    timeoutCount: toNumber(row.timeout_count),
    rateLimitedCount: toNumber(row.rate_limited_count),
    latestEventAt: row.latest_event_at,
    sinkHealthy: row.sink_healthy === true,
  };
}

export type AiUsagePolicy = {
  policyVersion: string;
  effectiveFrom: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  concurrentRequests: number;
  budgetUsdPerDay: number;
  hardCapUsdPerDay: number;
  warningPercent: number;
  criticalPercent: number;
};

export type AiUsagePolicyRow = {
  policy_version: string;
  effective_from: string;
  requests_per_minute: number | string;
  requests_per_day: number | string;
  concurrent_requests: number | string;
  budget_usd_per_day: number | string;
  hard_cap_usd_per_day: number | string;
  warning_ratio: number | string;
  critical_ratio: number | string;
};

export function toAiUsagePolicy(row: AiUsagePolicyRow): AiUsagePolicy {
  return {
    policyVersion: row.policy_version,
    effectiveFrom: row.effective_from,
    requestsPerMinute: Number(row.requests_per_minute),
    requestsPerDay: Number(row.requests_per_day),
    concurrentRequests: Number(row.concurrent_requests),
    budgetUsdPerDay: Number(row.budget_usd_per_day),
    hardCapUsdPerDay: Number(row.hard_cap_usd_per_day),
    warningPercent: Number(row.warning_ratio) * 100,
    criticalPercent: Number(row.critical_ratio) * 100,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type AiUsageLogRow = {
  event_version?: number | string | null;
  request_id?: string | null;
  call_id?: string | null;
  function_name: string;
  feature?: string | null;
  provider?: string | null;
  model?: string | null;
  latency_ms: number;
  status: "success" | "failure";
  outcome?: AiOutcome | null;
  estimated_cost_usd: number | string | null;
  pricing_status?: "finalized" | "not_finalized" | "unavailable" | null;
  token_status?: "valid" | "missing" | "anomalous" | "inconsistent" | null;
  usage_source?: "provider" | "input_estimate" | "none" | null;
  created_at: string;
};

export type AiUsageControlEventRow = {
  event_version?: number | string | null;
  request_id?: string | null;
  call_id?: string | null;
  function_name: string;
  event_type: "reservation_allowed" | "reservation_blocked" | "provider_error" | "usage_rejected" | "lease_released";
  decision: "allow" | "block" | "observe";
  outcome?: AiOutcome | null;
  reason: string;
  created_at: string;
};

export type AiUsageControlSummary = {
  total: number;
  blocked: number;
  providerErrors: number;
  usageRejected: number;
  byReason: Array<{ reason: string; count: number }>;
};

export type AiUsageDimensionMetric = AiUsageMetric & {
  feature: string;
  model: string;
};

export type AiUsageOutcomeCounts = Record<AiOutcome, number>;

export type AiUsageMetric = {
  calls: number;
  successes: number;
  failures: number;
  p95LatencyMs: number;
  outcomeCounts: AiUsageOutcomeCounts;
  failureRate: number;
  averageLatencyMs: number;
  estimatedCostUsd: number;
  unpricedCalls: number;
  estimatedCalls: number;
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
  latencies: number[];
  outcomeCounts: AiUsageOutcomeCounts;
  totalLatencyMs: number;
  estimatedCostUsd: number;
  unpricedCalls: number;
  estimatedCalls: number;
};

function createOutcomeCounts(): AiUsageOutcomeCounts {
  return {
    success: 0,
    failure: 0,
    timeout: 0,
    rate_limited: 0,
    blocked: 0,
  };
}

function createMetric(): MutableMetric {
  return {
    calls: 0,
    successes: 0,
    failures: 0,
    latencies: [],
    outcomeCounts: createOutcomeCounts(),
    totalLatencyMs: 0,
    estimatedCostUsd: 0,
    unpricedCalls: 0,
    estimatedCalls: 0,
  };
}

function round(value: number, fractionDigits: number): number {
  return Number(value.toFixed(fractionDigits));
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * 0.95;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function toPublicMetric(metric: MutableMetric): AiUsageMetric {
  return {
    calls: metric.calls,
    successes: metric.successes,
    failures: metric.failures,
    p95LatencyMs: metric.latencies.length === 0 ? 0 : round(percentile95(metric.latencies), 1),
    outcomeCounts: { ...metric.outcomeCounts },
    failureRate: metric.calls === 0 ? 0 : round((metric.failures / metric.calls) * 100, 1),
    averageLatencyMs: metric.calls === 0 ? 0 : round(metric.totalLatencyMs / metric.calls, 1),
    estimatedCostUsd: round(metric.estimatedCostUsd, 8),
    unpricedCalls: metric.unpricedCalls,
    estimatedCalls: metric.estimatedCalls,
  };
}

const AI_OUTCOMES: AiOutcome[] = ["success", "failure", "timeout", "rate_limited", "blocked"];

function outcomeForRow(row: AiUsageLogRow): AiOutcome {
  return row.outcome && AI_OUTCOMES.includes(row.outcome)
    ? row.outcome
    : row.status === "success" ? "success" : "failure";
}

function addRow(metric: MutableMetric, row: AiUsageLogRow): void {
  const latencyMs = Number(row.latency_ms);
  const costUsd = Number(row.estimated_cost_usd ?? 0);
  const outcome = outcomeForRow(row);
  metric.calls += 1;
  metric.outcomeCounts[outcome] += 1;
  metric.successes += outcome === "success" ? 1 : 0;
  metric.failures += outcome === "success" ? 0 : 1;
  if (Number.isFinite(latencyMs) && latencyMs >= 0) {
    metric.latencies.push(latencyMs);
    metric.totalLatencyMs += latencyMs;
  }
  const finalized = row.pricing_status === undefined || row.pricing_status === "finalized";
  if (!finalized || row.estimated_cost_usd === null) metric.unpricedCalls += 1;
  if (row.usage_source === "input_estimate") metric.estimatedCalls += 1;
  metric.estimatedCostUsd += finalized && Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : 0;
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

export function aggregateAiUsageByFeatureModel(rows: AiUsageLogRow[]): AiUsageDimensionMetric[] {
  const metrics = new Map<string, MutableMetric & { feature: string; model: string }>();
  for (const row of rows) {
    const feature = row.feature?.trim() || row.function_name?.trim();
    const model = row.model?.trim() || "unknown";
    const createdAt = new Date(row.created_at);
    if (!feature || Number.isNaN(createdAt.getTime())) continue;
    if (row.status !== "success" && row.status !== "failure") continue;
    const key = `${feature}\u0000${model}`;
    const metric = metrics.get(key) ?? { ...createMetric(), feature, model };
    addRow(metric, row);
    metrics.set(key, metric);
  }
  return Array.from(metrics.values())
    .sort((left, right) => left.feature.localeCompare(right.feature) || left.model.localeCompare(right.model))
    .map(({ feature, model, ...metric }) => ({ feature, model, ...toPublicMetric(metric) }));
}

export function aggregateAiUsageControls(rows: AiUsageControlEventRow[]): AiUsageControlSummary {
  const byReason = new Map<string, number>();
  let blocked = 0;
  let providerErrors = 0;
  let usageRejected = 0;
  for (const row of rows) {
    if (!row?.reason || !row?.event_type) continue;
    byReason.set(row.reason, (byReason.get(row.reason) ?? 0) + 1);
    if (row.decision === "block") blocked += 1;
    if (row.event_type === "provider_error") providerErrors += 1;
    if (row.event_type === "usage_rejected") usageRejected += 1;
  }
  return {
    total: rows.length,
    blocked,
    providerErrors,
    usageRejected,
    byReason: Array.from(byReason.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([reason, count]) => ({ reason, count })),
  };
}
