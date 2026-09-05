import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const MAX_RANGE_DAYS = 31;
export const MAX_PAGE_SIZE = 50;
export const DEFAULT_MONITOR_RANGE = {
  from: "2026-09-01",
  to: "2026-09-03",
} as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALUE_PATTERN = /^[A-Za-z0-9._:/-]+$/;
const STATUS_VALUES = new Set(["all", "success", "failure", "cancelled"]);
const OUTCOME_VALUES = new Set(["all", "success", "failure", "timeout", "rate_limited", "cancelled"]);
const ERROR_TYPE_VALUES = new Set(["all", "provider_error", "timeout", "rate_limit", "cancelled"]);
const CORE_PATH = "ai-monitor/src/core.mjs";
const FIXTURE_PATH = "ai-monitor/fixtures/events.json";

export type AiMonitorGroup = {
  readonly key: string;
  readonly requests: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly ttftMs: number;
  readonly costUsd: number;
  readonly errors: number;
  readonly cancellations: number;
};

export type AiMonitorFeatureModelGroup = Omit<AiMonitorGroup, "key"> & {
  readonly feature: string;
  readonly provider: string;
  readonly model: string;
};

export type AiMonitorError = {
  readonly eventId: string;
  readonly timestamp: string;
  readonly provider: string;
  readonly model: string;
  readonly outcome: string;
  readonly errorType: string | null;
  readonly errorCode: string | null;
  readonly traceId: string;
  readonly correlationId: string;
};

export type AiMonitorTrace = {
  readonly eventId: string;
  readonly traceId: string;
  readonly correlationId: string;
  readonly spanId: string;
  readonly timestamp: string;
  readonly provider: string;
  readonly model: string;
  readonly status: string;
  readonly outcome: string;
};

type AiMonitorTotals = {
  readonly requests: number;
  readonly successes: number;
  readonly failures: number;
  readonly cancellations: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly ttftMs: number;
  readonly averageTtftMs: number;
  readonly p95TtftMs: number;
  readonly costUsd: number;
  readonly errorRate: number;
};

export type AiMonitorFilters = {
  readonly from: string;
  readonly to: string;
  readonly provider: string;
  readonly model: string;
  readonly status: string;
  readonly outcome: string;
  readonly errorType: string;
  readonly page: number;
  readonly pageSize: number;
};

export type AiMonitorReport = {
  readonly range: { readonly from: string; readonly to: string };
  readonly filters: AiMonitorFilters;
  readonly totals: AiMonitorTotals;
  readonly daily: readonly AiMonitorGroup[];
  readonly providers: readonly AiMonitorGroup[];
  readonly models: readonly AiMonitorGroup[];
  readonly featureModels: readonly AiMonitorFeatureModelGroup[];
  readonly recentErrors: readonly AiMonitorError[];
  readonly traces: readonly AiMonitorTrace[];
  readonly pricingVersions: readonly string[];
  readonly options: {
    readonly providers: readonly string[];
    readonly models: readonly string[];
  };
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
  readonly health: {
    readonly status: "healthy" | "warning" | "critical" | "unknown";
    readonly label: "정상" | "주의" | "위험" | "확인 필요";
    readonly errorRateWarning: number;
    readonly errorRateCritical: number;
    readonly p95WarningMs: number;
    readonly p95CriticalMs: number;
  };
};

type CoreReport = Omit<AiMonitorReport, "range" | "filters" | "options" | "pagination" | "health">;
type CoreEvent = {
  readonly feature: string;
  readonly provider: string;
  readonly model: string;
};
type CoreModule = {
  readonly normalizeEvents: (events: unknown) => readonly CoreEvent[];
  readonly filterEvents: (events: readonly CoreEvent[], filters: Readonly<Record<string, string>>) => readonly CoreEvent[];
  readonly aggregateReport: (events: readonly CoreEvent[], options: { readonly recentErrorsLimit: number }) => CoreReport;
};

export class AiMonitorQueryError extends Error {
  readonly name = "AiMonitorQueryError";
  readonly field: string;

  constructor(field: string) {
    super(`Invalid AI monitor filter: ${field}`);
    this.field = field;
  }
}

function parseDate(value: string | null, fallback: string, field: string): string {
  const candidate = value?.trim() || fallback;
  const date = new Date(`${candidate}T00:00:00.000Z`);
  if (!DATE_PATTERN.test(candidate) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== candidate) {
    throw new AiMonitorQueryError(field);
  }
  return candidate;
}

function parseChoice(value: string | null, allowed: ReadonlySet<string>, field: string): string {
  const candidate = value?.trim() || "all";
  if (!allowed.has(candidate)) throw new AiMonitorQueryError(field);
  return candidate;
}

function parseDimension(value: string | null, field: string): string {
  const candidate = value?.trim() || "all";
  if (candidate !== "all" && (candidate.length > 80 || !VALUE_PATTERN.test(candidate))) {
    throw new AiMonitorQueryError(field);
  }
  return candidate;
}

function parseInteger(value: string | null, fallback: number, maximum: number, field: string): number {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) throw new AiMonitorQueryError(field);
  return parsed;
}

export function parseAiMonitorFilters(params: URLSearchParams): AiMonitorFilters {
  const from = parseDate(params.get("from"), DEFAULT_MONITOR_RANGE.from, "from");
  const to = parseDate(params.get("to"), DEFAULT_MONITOR_RANGE.to, "to");
  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const toTime = Date.parse(`${to}T00:00:00.000Z`);
  const rangeDays = Math.floor((toTime - fromTime) / 86_400_000) + 1;
  if (rangeDays < 1 || rangeDays > MAX_RANGE_DAYS) throw new AiMonitorQueryError("range");

  return {
    from,
    to,
    provider: parseDimension(params.get("provider"), "provider"),
    model: parseDimension(params.get("model"), "model"),
    status: parseChoice(params.get("status"), STATUS_VALUES, "status"),
    outcome: parseChoice(params.get("outcome"), OUTCOME_VALUES, "outcome"),
    errorType: parseChoice(params.get("errorType"), ERROR_TYPE_VALUES, "errorType"),
    page: parseInteger(params.get("page"), 1, 1000, "page"),
    pageSize: parseInteger(params.get("pageSize"), 2, MAX_PAGE_SIZE, "pageSize"),
  };
}

export async function loadAiMonitorReport(filters: AiMonitorFilters): Promise<AiMonitorReport> {
  const repositoryRoot = resolve(process.cwd(), "..");
  const core: CoreModule = await import(/* webpackIgnore: true */ resolve(repositoryRoot, CORE_PATH));
  const rawEvents: unknown = JSON.parse(await readFile(resolve(repositoryRoot, FIXTURE_PATH), "utf8"));
  const allEvents = core.normalizeEvents(rawEvents);
  const nextDay = new Date(`${filters.to}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const exactFilters = {
    from: `${filters.from}T00:00:00.000Z`,
    to: nextDay.toISOString(),
    ...(filters.provider === "all" ? {} : { provider: filters.provider }),
    ...(filters.model === "all" ? {} : { model: filters.model }),
    ...(filters.status === "all" ? {} : { status: filters.status }),
    ...(filters.outcome === "all" ? {} : { outcome: filters.outcome }),
    ...(filters.errorType === "all" ? {} : { errorType: filters.errorType }),
  };
  const filteredEvents = core.filterEvents(allEvents, exactFilters);
  const report = core.aggregateReport(filteredEvents, { recentErrorsLimit: filteredEvents.length });
  const start = (filters.page - 1) * filters.pageSize;
  const totalItems = report.recentErrors.length;
  const errorRateWarning = 0.1;
  const errorRateCritical = 0.25;
  const p95WarningMs = 2500;
  const p95CriticalMs = 4000;
  const isCritical = report.totals.errorRate >= errorRateCritical || report.totals.p95LatencyMs >= p95CriticalMs;
  const isWarning = report.totals.errorRate >= errorRateWarning || report.totals.p95LatencyMs >= p95WarningMs;
  const status = report.totals.requests === 0
    ? "unknown"
    : isCritical ? "critical" : isWarning ? "warning" : "healthy";

  return {
    ...report,
    range: { from: filters.from, to: filters.to },
    filters,
    recentErrors: report.recentErrors.slice(start, start + filters.pageSize),
    options: {
      providers: [...new Set(allEvents.map((event) => event.provider))].sort(),
      models: [...new Set(allEvents.map((event) => event.model))].sort(),
    },
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
    },
    health: {
      status,
      label: status === "unknown" ? "확인 필요" : status === "critical" ? "위험" : status === "warning" ? "주의" : "정상",
      errorRateWarning,
      errorRateCritical,
      p95WarningMs,
      p95CriticalMs,
    },
  };
}
