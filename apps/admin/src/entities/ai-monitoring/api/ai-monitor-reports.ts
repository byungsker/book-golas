import type { AiMonitorFilters, AiMonitorReport } from "./ai-monitor.ts";
import { DEFAULT_MONITOR_RANGE, MAX_PAGE_SIZE } from "./ai-monitor.ts";

export type MonitorReportPeriod = "day" | "month" | "quarter" | "year" | "custom";

export const monitorReportPeriods: readonly { readonly key: MonitorReportPeriod; readonly label: string }[] = [
  { key: "day", label: "일별" },
  { key: "month", label: "월별" },
  { key: "quarter", label: "분기별" },
  { key: "year", label: "연간별" },
  { key: "custom", label: "사용자 지정" },
];

export type MonitorReportRange = {
  readonly period: MonitorReportPeriod;
  readonly from: string;
  readonly to: string;
};

export type MonitorReportRow = {
  readonly key: string;
  readonly requests: number;
  readonly errors: number;
  readonly cancellations: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly costUsd: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
};

export type MonitorInsight = {
  readonly tone: "critical" | "warning" | "positive" | "info";
  readonly title: string;
  readonly detail: string;
  readonly action: string;
};

export class MonitorReportQueryError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`Invalid report filter: ${field}`);
    this.name = "MonitorReportQueryError";
    this.field = field;
  }
}

function parseDate(value: string | null, fallback: string, field: string): string {
  const candidate = value?.trim() || fallback;
  const date = new Date(`${candidate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== candidate) {
    throw new MonitorReportQueryError(field);
  }
  return candidate;
}

function parsePeriod(value: string | null): MonitorReportPeriod {
  const candidate = value || "day";
  if (monitorReportPeriods.every((period) => period.key !== candidate)) throw new MonitorReportQueryError("period");
  return candidate as MonitorReportPeriod;
}

function endOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
}

function anchorDate(params: URLSearchParams): string {
  return parseDate(params.get("anchor") || params.get("to"), DEFAULT_MONITOR_RANGE.to, "anchor");
}

export function parseMonitorReportRange(params: URLSearchParams): MonitorReportRange {
  const period = parsePeriod(params.get("period"));
  if (period === "custom") {
    const from = parseDate(params.get("from"), DEFAULT_MONITOR_RANGE.from, "from");
    const to = parseDate(params.get("to"), DEFAULT_MONITOR_RANGE.to, "to");
    if (from > to) throw new MonitorReportQueryError("range");
    return { period, from, to };
  }

  const anchor = anchorDate(params);
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (period === "day") return { period, from: `${year}-${String(month + 1).padStart(2, "0")}-01`, to: endOfMonth(year, month) };
  if (period === "month") return { period, from: `${year}-${String(month + 1).padStart(2, "0")}-01`, to: endOfMonth(year, month) };
  if (period === "quarter") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return { period, from: `${year}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`, to: endOfMonth(year, quarterStartMonth + 2) };
  }
  return { period, from: `${year}-01-01`, to: `${year}-12-31` };
}

export function reportFilters(range: MonitorReportRange): AiMonitorFilters {
  return {
    from: range.from,
    to: range.to,
    provider: "all",
    model: "all",
    status: "all",
    outcome: "all",
    errorType: "all",
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  };
}

function periodKey(timestamp: string, period: MonitorReportPeriod): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (period === "day") return timestamp.slice(0, 10);
  if (period === "month") return `${year}-${String(month + 1).padStart(2, "0")}`;
  if (period === "quarter") return `${year} Q${Math.floor(month / 3) + 1}`;
  if (period === "year") return String(year);
  return "사용자 지정 기간";
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
}

export function buildReportRows(report: AiMonitorReport, period: MonitorReportPeriod): readonly MonitorReportRow[] {
  const buckets = new Map<string, { requests: number; errors: number; cancellations: number; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; latencies: number[] }>();
  for (const request of report.requestLogs) {
    const key = periodKey(request.timestamp, period);
    const bucket = buckets.get(key) ?? { requests: 0, errors: 0, cancellations: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, latencies: [] };
    bucket.requests += 1;
    bucket.errors += request.status === "failure" ? 1 : 0;
    bucket.cancellations += request.status === "cancelled" ? 1 : 0;
    bucket.inputTokens += request.inputTokens;
    bucket.outputTokens += request.outputTokens;
    bucket.totalTokens += request.totalTokens;
    bucket.costUsd = Number((bucket.costUsd + request.costUsd).toFixed(12));
    bucket.latencies.push(request.latencyMs);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, bucket]) => ({
    key,
    requests: bucket.requests,
    errors: bucket.errors,
    cancellations: bucket.cancellations,
    inputTokens: bucket.inputTokens,
    outputTokens: bucket.outputTokens,
    totalTokens: bucket.totalTokens,
    costUsd: bucket.costUsd,
    averageLatencyMs: bucket.requests === 0 ? 0 : Number((bucket.latencies.reduce((sum, value) => sum + value, 0) / bucket.requests).toFixed(1)),
    p95LatencyMs: percentile95(bucket.latencies),
  }));
}

function formatInteger(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function buildMonitorInsights(report: AiMonitorReport): readonly MonitorInsight[] {
  if (report.totals.requests === 0) {
    return [{ tone: "info", title: "관측된 요청이 없습니다", detail: "선택한 기간과 조건에 해당하는 요청 로그가 없습니다.", action: "기간 또는 필터를 넓혀 다시 조회하세요." }];
  }

  const insights: MonitorInsight[] = [];
  if (report.totals.p95LatencyMs >= report.health.p95CriticalMs) {
    insights.push({ tone: "critical", title: "p95 latency가 위험 기준을 넘었습니다", detail: `p95 ${formatInteger(report.totals.p95LatencyMs)}ms가 위험 기준 ${formatInteger(report.health.p95CriticalMs)}ms보다 높습니다.`, action: "timeout 예산과 느린 Provider의 fallback·queue 정책을 점검하세요." });
  } else if (report.totals.p95LatencyMs >= report.health.p95WarningMs) {
    insights.push({ tone: "warning", title: "p95 latency를 관찰하세요", detail: `p95 ${formatInteger(report.totals.p95LatencyMs)}ms가 주의 기준 ${formatInteger(report.health.p95WarningMs)}ms를 넘었습니다.`, action: "기능별 latency와 retry 횟수를 좁혀 확인하세요." });
  }

  if (report.totals.failures > 0) {
    insights.push({ tone: "warning", title: `${formatInteger(report.totals.failures)}건의 실패가 관측되었습니다`, detail: `전체 ${formatInteger(report.totals.requests)}건 중 오류율은 ${(report.totals.errorRate * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%입니다.`, action: "전체 로그에서 error type과 Trace를 기준으로 원인을 묶어 보세요." });
  }

  const retryCount = report.requestLogs.reduce((sum, request) => sum + request.retryCount, 0);
  if (retryCount > 0) {
    insights.push({ tone: "info", title: `재시도 ${formatInteger(retryCount)}회가 기록되었습니다`, detail: "재시도는 latency와 비용을 함께 키울 수 있는 운영 신호입니다.", action: "rate limit에는 backoff·분산, timeout에는 deadline과 fallback을 검토하세요." });
  }

  const topModel = [...report.models].sort((left, right) => right.costUsd - left.costUsd)[0];
  if (topModel && report.totals.costUsd > 0) {
    const share = topModel.costUsd / report.totals.costUsd;
    if (share >= 0.6) {
      insights.push({ tone: "info", title: `${topModel.key}에 비용이 집중되어 있습니다`, detail: `선택한 기간 예상 비용의 ${(share * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%를 차지합니다.`, action: "해당 기능·모델의 token 상한과 대체 모델의 품질·비용을 비교하세요." });
    }
  }

  if (insights.length === 0) {
    insights.push({ tone: "positive", title: "현재 범위에서 뚜렷한 경고가 없습니다", detail: `요청 ${formatInteger(report.totals.requests)}건의 집계와 건별 로그가 일치합니다.`, action: "이 기준을 baseline으로 저장하고 다음 기간과 비교하세요." });
  }
  return insights.slice(0, 4);
}
