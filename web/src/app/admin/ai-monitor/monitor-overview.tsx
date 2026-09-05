import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiMonitorGroup, AiMonitorReport } from "@/lib/ai-monitor";

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCost(value: number): string {
  return `$${value.toFixed(6)}`;
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

function BreakdownList(props: { readonly title: string; readonly description: string; readonly rows: readonly AiMonitorGroup[] }) {
  const maxRequests = Math.max(1, ...props.rows.map((row) => row.requests));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">선택한 조건의 집계 데이터가 없습니다.</p>
        ) : props.rows.map((row) => (
          <div key={row.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium" title={row.key}>{row.key}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatNumber(row.requests)}건 · {formatCost(row.costUsd)}
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

export function MonitorOverview({ report }: { readonly report: AiMonitorReport }) {
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
          <MetricCard label="예상 비용" value={formatCost(report.totals.costUsd)} detail={`가격표 ${report.pricingVersions.join(", ") || "해당 없음"}`} />
          <MetricCard label="오류율" value={formatPercent(report.totals.errorRate)} detail={`${formatNumber(report.totals.failures)}건 실패`} />
        </div>
      </section>

      <Card className={healthClass(report.health.status)}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Threshold · Health</CardTitle>
            <Badge variant={report.health.status === "critical" ? "destructive" : "outline"}>{report.health.label}</Badge>
          </div>
          <CardDescription>
            오류율 또는 p95 latency 중 더 나쁜 기준으로 상태를 결정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <p><span className="font-medium">현재 p95</span><br />{formatNumber(report.totals.p95LatencyMs)} ms</p>
          <p><span className="font-medium">주의 기준</span><br />오류율 {formatPercent(report.health.errorRateWarning)} · p95 {formatNumber(report.health.p95WarningMs)} ms</p>
          <p><span className="font-medium">위험 기준</span><br />오류율 {formatPercent(report.health.errorRateCritical)} · p95 {formatNumber(report.health.p95CriticalMs)} ms</p>
        </CardContent>
      </Card>

      <section aria-label="Provider와 model 집계" className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Provider 사용량과 비용" description="요청량 기준 상대 막대와 토큰·비용 집계입니다." rows={report.providers} />
        <BreakdownList title="Model 사용량과 비용" description="모델별 요청, 토큰, 오류 및 추정 비용입니다." rows={report.models} />
      </section>
    </>
  );
}
