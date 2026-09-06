import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostToggle, type CostCurrency } from "./monitor-currency";
import { P95Tooltip, formatCost, formatNumber, formatPercent } from "./monitor-overview";
import { monitorReportPeriods, type MonitorInsight, type MonitorReportPeriod, type MonitorReportRange, type MonitorReportRow } from "@/lib/ai-monitor-reports";

function periodHref(period: MonitorReportPeriod, anchor: string, currency: CostCurrency, range: MonitorReportRange): string {
  const params = new URLSearchParams({ period, anchor, currency });
  if (period === "custom") {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return `/admin/ai-monitor/reports?${params.toString()}`;
}

export function ReportPeriodSelector({
  currency,
  range,
}: {
  readonly currency: CostCurrency;
  readonly range: MonitorReportRange;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>리포트 기간</CardTitle>
        <CardDescription>일·월·분기·연간 기준을 선택하거나 UTC 날짜를 직접 지정합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <nav aria-label="리포트 기간 유형" className="flex min-w-0 gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {monitorReportPeriods.map((period) => {
            const isActive = period.key === range.period;
            return (
              <Link
                key={period.key}
                href={periodHref(period.key, range.to, currency, range)}
                aria-current={isActive ? "page" : undefined}
                className={isActive
                  ? "shrink-0 rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
                  : "shrink-0 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"}
              >
                {period.label}
              </Link>
            );
          })}
        </nav>
        <form method="get" action="/admin/ai-monitor/reports" className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="period" value="custom" />
          <input type="hidden" name="currency" value={currency} />
          <div className="space-y-2"><Label htmlFor="report-from">시작일</Label><Input id="report-from" name="from" type="date" defaultValue={range.from} /></div>
          <div className="space-y-2"><Label htmlFor="report-to">종료일</Label><Input id="report-to" name="to" type="date" defaultValue={range.to} /></div>
          <Button type="submit">사용자 지정 조회</Button>
        </form>
        <p className="text-xs text-muted-foreground">현재 범위: {range.from} ~ {range.to} · 데이터 기준: Preview fixture</p>
      </CardContent>
    </Card>
  );
}

export function ReportSummary({
  currency,
  report,
}: {
  readonly currency: CostCurrency;
  readonly report: { readonly totals: { readonly requests: number; readonly totalTokens: number; readonly p95LatencyMs: number; readonly costUsd: number; readonly errorRate: number } };
}) {
  return (
    <section aria-labelledby="report-summary" className="space-y-3">
      <h2 id="report-summary" className="font-semibold text-foreground">리포트 요약</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>요청</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{formatNumber(report.totals.requests)}</p><p className="mt-1 text-xs text-muted-foreground">선택한 기간의 전체 요청</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>토큰</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{formatNumber(report.totals.totalTokens)}</p><p className="mt-1 text-xs text-muted-foreground">입력·출력 합계</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><div className="flex items-center gap-2"><CardDescription>p95 latency</CardDescription><P95Tooltip /></div></CardHeader><CardContent><p className="text-2xl font-bold">{formatNumber(report.totals.p95LatencyMs)} ms</p><p className="mt-1 text-xs text-muted-foreground">꼬리 지연 기준</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>예상 비용</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{formatCost(report.totals.costUsd, currency)}</p><p className="mt-1 text-xs text-muted-foreground">오류율 {formatPercent(report.totals.errorRate)}</p></CardContent></Card>
      </div>
    </section>
  );
}

function insightClass(tone: MonitorInsight["tone"]): string {
  switch (tone) {
    case "critical": return "border-destructive/50 bg-destructive/5";
    case "warning": return "border-chart-4/60 bg-chart-4/5";
    case "positive": return "border-chart-2/50 bg-chart-2/5";
    default: return "border-border bg-muted/30";
  }
}

export function ReportInsights({ insights }: { readonly insights: readonly MonitorInsight[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3"><div><CardTitle>개선 인사이트</CardTitle><CardDescription>선택한 범위의 수치에서 바로 확인할 운영 액션입니다.</CardDescription></div><Badge variant="outline">자동 요약</Badge></div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {insights.map((insight) => (
          <article key={`${insight.title}-${insight.action}`} className={`rounded-lg border p-4 ${insightClass(insight.tone)}`}>
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="mt-2 text-sm text-foreground/80">{insight.detail}</p>
            <p className="mt-3 text-sm font-medium text-foreground">다음 액션 · {insight.action}</p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

export function ReportTable({
  currency,
  pathname,
  query,
  rows,
}: {
  readonly currency: CostCurrency;
  readonly pathname: string;
  readonly query: string;
  readonly rows: readonly MonitorReportRow[];
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2"><CardTitle>기간별 운영 지표</CardTitle><CardDescription>요청, 오류율, 평균 latency, p95, 토큰과 예상 비용을 같은 범위로 비교합니다.</CardDescription></div>
          <CostToggle currency={currency} pathname={pathname} query={query} />
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">선택한 기간의 요청이 없습니다.</p> : (
          <Table>
            <TableCaption>기간별 요청, 오류율, latency, 토큰과 예상 비용</TableCaption>
            <TableHeader><TableRow>
              <TableHead scope="col">기간</TableHead>
              <TableHead scope="col" className="text-right">요청</TableHead>
              <TableHead scope="col" className="text-right">오류율</TableHead>
              <TableHead scope="col" className="text-right">평균 latency</TableHead>
              <TableHead scope="col"><span className="flex items-center gap-1">p95 latency <P95Tooltip /></span></TableHead>
              <TableHead scope="col" className="text-right">토큰</TableHead>
              <TableHead scope="col" className="text-right">비용</TableHead>
            </TableRow></TableHeader>
            <TableBody>{rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.key}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.requests)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(row.requests === 0 ? 0 : row.errors / row.requests)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.averageLatencyMs)} ms</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.p95LatencyMs)} ms</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.totalTokens)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCost(row.costUsd, currency)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
