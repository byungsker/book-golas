import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useId } from "react";
import type { AiMonitorGroup, AiMonitorReport } from "@/lib/ai-monitor";
import { CostToggle, DEFAULT_COST_CURRENCY, formatCost as formatCurrencyCost, type CostCurrency } from "./monitor-currency";
import { ProviderConnections } from "./monitor-connections";

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCost(value: number, currency: CostCurrency = DEFAULT_COST_CURRENCY): string {
  return formatCurrencyCost(value, currency);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function MetricCard(props: { readonly label: string; readonly value: string; readonly detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{props.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{props.detail}</p>
      </CardContent>
    </Card>
  );
}

export function P95Tooltip() {
  const tooltipId = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="p95 설명 보기"
        aria-describedby={tooltipId}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="invisible pointer-events-none absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-popover p-3 text-left text-xs leading-5 text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        p95는 선택한 요청 latency를 낮은 순서로 정렬했을 때 95% 지점의 값입니다. 표본이 적으면 가장 느린 요청과 같을 수 있으며, 평균보다 꼬리 지연을 확인하는 데 유용합니다.
      </span>
    </span>
  );
}

function healthClass(status: AiMonitorReport["health"]["status"]): string {
  switch (status) {
    case "healthy":
      return "border-chart-2/50 bg-chart-2/5";
    case "warning":
      return "border-chart-4/60 bg-chart-4/5";
    case "critical":
      return "border-destructive/50 bg-destructive/5";
    case "unknown":
      return "border-border bg-muted/30";
  }
}

function BreakdownList(props: {
  readonly title: string;
  readonly description: string;
  readonly rows: readonly AiMonitorGroup[];
  readonly currency: CostCurrency;
  readonly pathname: string;
  readonly query: string;
}) {
  const maxRequests = Math.max(1, ...props.rows.map((row) => row.requests));
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>{props.title}</CardTitle>
            <CardDescription>{props.description}</CardDescription>
          </div>
          <CostToggle currency={props.currency} pathname={props.pathname} query={props.query} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">선택한 조건의 집계 데이터가 없습니다.</p>
        ) : props.rows.map((row) => (
          <div key={row.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium" title={row.key}>{row.key}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatNumber(row.requests)}건 · {formatCost(row.costUsd, props.currency)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${Math.max(3, (row.requests / maxRequests) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              토큰 {formatNumber(row.totalTokens)} · 오류 {formatNumber(row.errors)} · 취소 {formatNumber(row.cancellations)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MonitorOverview({
  currency,
  pathname,
  query,
  report,
}: {
  readonly currency: CostCurrency;
  readonly pathname: string;
  readonly query: string;
  readonly report: AiMonitorReport;
}) {
  return (
    <>
      <section aria-labelledby="monitor-kpis" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="monitor-kpis" className="font-semibold text-foreground">핵심 운영 지표</h2>
          <Badge variant="outline" className={healthClass(report.health.status)}>
            상태: {report.health.label}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="요청" value={formatNumber(report.totals.requests)} detail={`${report.totals.successes}건 성공 · ${report.totals.cancellations}건 취소`} />
          <MetricCard label="토큰" value={formatNumber(report.totals.totalTokens)} detail={`입력 ${formatNumber(report.totals.inputTokens)} · 출력 ${formatNumber(report.totals.outputTokens)}`} />
          <MetricCard label="예상 비용" value={formatCost(report.totals.costUsd, currency)} detail={`가격표 ${report.pricingVersions.join(", ") || "해당 없음"}`} />
          <MetricCard label="오류율" value={formatPercent(report.totals.errorRate)} detail={`${formatNumber(report.totals.failures)}건 실패`} />
        </div>
      </section>

      <Card className={healthClass(report.health.status)}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Threshold · Health</CardTitle>
              <P95Tooltip />
            </div>
            <Badge variant={report.health.status === "critical" ? "destructive" : "outline"}>{report.health.label}</Badge>
          </div>
          <CardDescription>
            p95는 선택한 조건의 latency를 낮은 순으로 놓았을 때 95% 지점입니다. 표본이 적으면 가장 느린 요청과 같을 수 있습니다.
          </CardDescription>
          <p className="text-xs text-muted-foreground">상태는 오류율 또는 p95 latency 중 더 나쁜 기준으로 결정합니다.</p>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <p><span className="font-medium">현재 p95</span><br />{formatNumber(report.totals.p95LatencyMs)} ms</p>
          <p><span className="font-medium">주의 기준</span><br />오류율 {formatPercent(report.health.errorRateWarning)} · p95 {formatNumber(report.health.p95WarningMs)} ms</p>
          <p><span className="font-medium">위험 기준</span><br />오류율 {formatPercent(report.health.errorRateCritical)} · p95 {formatNumber(report.health.p95CriticalMs)} ms</p>
        </CardContent>
      </Card>

      <section aria-label="Provider와 model 집계" className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Provider 사용량과 비용" description="요청량 기준 상대 막대와 토큰·비용 집계입니다." rows={report.providers} currency={currency} pathname={pathname} query={query} />
        <BreakdownList title="Model 사용량과 비용" description="모델별 요청, 토큰, 오류 및 추정 비용입니다." rows={report.models} currency={currency} pathname={pathname} query={query} />
      </section>

      <ProviderConnections providers={report.providers} />
    </>
  );
}
