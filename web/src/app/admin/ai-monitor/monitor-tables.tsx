import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiMonitorFilters, AiMonitorReport, AiMonitorTrace } from "@/lib/ai-monitor";
import { CostToggle, type CostCurrency } from "./monitor-currency";
import { formatCost, formatNumber, formatPercent } from "./monitor-overview";

function outcomeBadge(outcome: string) {
  if (outcome === "timeout" || outcome === "rate_limited") return "destructive";
  if (outcome === "success") return "secondary";
  return "outline";
}

function pageHref(filters: AiMonitorFilters, page: number, currency: CostCurrency): string {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    provider: filters.provider,
    model: filters.model,
    status: filters.status,
    outcome: filters.outcome,
    errorType: filters.errorType,
    page: String(page),
    pageSize: String(filters.pageSize),
    currency,
  });
  return `/admin/ai-monitor?${params.toString()}`;
}

function TraceDialog({ trace }: { readonly trace: AiMonitorTrace | undefined }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Trace 보기</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trace · correlation detail</DialogTitle>
          <DialogDescription>사용자 입력과 출력 내용 없이 운영 식별자만 표시합니다.</DialogDescription>
        </DialogHeader>
        {trace ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Event ID</dt><dd className="break-all font-mono">{trace.eventId}</dd>
            <dt className="text-muted-foreground">Trace ID</dt><dd className="break-all font-mono">{trace.traceId}</dd>
            <dt className="text-muted-foreground">Correlation ID</dt><dd className="break-all font-mono">{trace.correlationId}</dd>
            <dt className="text-muted-foreground">Span ID</dt><dd className="break-all font-mono">{trace.spanId}</dd>
            <dt className="text-muted-foreground">Outcome</dt><dd>{trace.outcome}</dd>
          </dl>
        ) : <p className="text-sm text-muted-foreground">연결된 trace가 없습니다.</p>}
      </DialogContent>
    </Dialog>
  );
}

export function TrendTable({
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
  const maxLatency = Math.max(1, ...report.daily.map((day) => day.requests === 0 ? 0 : day.latencyMs / day.requests));
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Latency와 오류 추이</CardTitle>
            <CardDescription>UTC 일자별 평균 latency와 오류율입니다. 막대 값은 아래 표와 동일합니다.</CardDescription>
          </div>
          <CostToggle currency={currency} pathname={pathname} query={query} />
        </div>
      </CardHeader>
      <CardContent>
        {report.daily.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">선택한 조건의 추이 데이터가 없습니다.</p> : (
          <Table>
            <TableCaption>일별 요청, 평균 latency, 오류율과 예상 비용</TableCaption>
            <TableHeader><TableRow>
              <TableHead scope="col">날짜</TableHead><TableHead scope="col">Latency 추이</TableHead><TableHead scope="col" className="text-right">오류율</TableHead><TableHead scope="col" className="text-right">비용</TableHead>
            </TableRow></TableHeader>
            <TableBody>{report.daily.map((day) => {
              const averageLatency = day.requests === 0 ? 0 : day.latencyMs / day.requests;
              const errorRate = day.requests === 0 ? 0 : day.errors / day.requests;
              return <TableRow key={day.key}>
                <TableCell className="font-medium">{day.key}<span className="ml-2 text-xs text-muted-foreground">{day.requests}건</span></TableCell>
                <TableCell className="min-w-56">
                  <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-chart-2" style={{ width: `${Math.max(3, averageLatency / maxLatency * 100)}%` }} /></div><span className="w-20 text-right tabular-nums">{formatNumber(averageLatency)} ms</span></div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(errorRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCost(day.costUsd, currency)}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function FeatureModelTable({
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
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>기능별 모델 사용량</CardTitle>
            <CardDescription>기능·provider·model 조합별 요청, 토큰, 오류, 취소와 예상 비용입니다.</CardDescription>
          </div>
          <CostToggle currency={currency} pathname={pathname} query={query} />
        </div>
      </CardHeader>
      <CardContent>
        {report.featureModels.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">선택한 조건의 기능별 사용량이 없습니다.</p> : (
          <Table>
            <TableCaption>기능과 모델별 요청, 토큰, 오류, 취소와 예상 비용</TableCaption>
            <TableHeader><TableRow>
              <TableHead scope="col">기능</TableHead><TableHead scope="col">Provider</TableHead><TableHead scope="col">Model</TableHead><TableHead scope="col" className="text-right">요청</TableHead><TableHead scope="col" className="text-right">토큰</TableHead><TableHead scope="col" className="text-right">오류</TableHead><TableHead scope="col" className="text-right">취소</TableHead><TableHead scope="col" className="text-right">비용</TableHead>
            </TableRow></TableHeader>
            <TableBody>{report.featureModels.map((row) => (
              <TableRow key={`${row.feature}:${row.provider}:${row.model}`}>
                <TableCell className="font-medium">{row.feature}</TableCell>
                <TableCell className="text-muted-foreground">{row.provider}</TableCell>
                <TableCell className="font-mono">{row.model}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.requests)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.totalTokens)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.errors)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.cancellations)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCost(row.costUsd, currency)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function RequestLogTable({
  currency,
  description = "집계에 포함된 각 요청의 정규화된 운영 필드입니다. Event ID와 Trace로 원시 입력·출력 없이 수치를 대조할 수 있습니다.",
  pathname,
  query,
  report,
  title = "건별 요청 로그",
}: {
  readonly currency: CostCurrency;
  readonly description?: string;
  readonly pathname: string;
  readonly query: string;
  readonly report: AiMonitorReport;
  readonly title?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <CostToggle currency={currency} pathname={pathname} query={query} />
        </div>
      </CardHeader>
      <CardContent>
        {report.requestLogs.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">선택한 조건의 요청 로그가 없습니다.</p> : (
          <Table>
            <TableCaption>요청별 기능, 모델, 결과, 토큰, latency, 비용과 trace</TableCaption>
            <TableHeader><TableRow>
              <TableHead scope="col">시각 / Event</TableHead><TableHead scope="col">기능</TableHead><TableHead scope="col">Provider / Model</TableHead><TableHead scope="col">결과</TableHead><TableHead scope="col" className="text-right">토큰</TableHead><TableHead scope="col" className="text-right">Latency</TableHead><TableHead scope="col" className="text-right">비용</TableHead><TableHead scope="col" className="text-right">Trace</TableHead>
            </TableRow></TableHeader>
            <TableBody>{report.requestLogs.map((request) => (
              <TableRow key={request.eventId}>
                <TableCell><span className="font-medium">{new Date(request.timestamp).toLocaleString("ko-KR", { timeZone: "UTC" })} UTC</span><br /><span className="font-mono text-xs text-muted-foreground">{request.eventId}</span></TableCell>
                <TableCell className="font-medium">{request.feature}</TableCell>
                <TableCell><span className="font-medium">{request.provider}</span><br /><span className="font-mono text-xs text-muted-foreground">{request.model}</span></TableCell>
                <TableCell><Badge variant={outcomeBadge(request.outcome)}>{request.outcome}</Badge><br /><span className="text-xs text-muted-foreground">{request.status}</span></TableCell>
                <TableCell className="text-right tabular-nums"><span>{formatNumber(request.totalTokens)}</span><br /><span className="text-xs text-muted-foreground">입력 {formatNumber(request.inputTokens)} · 출력 {formatNumber(request.outputTokens)}</span></TableCell>
                <TableCell className="text-right tabular-nums"><span>{formatNumber(request.latencyMs)} ms</span><br /><span className="text-xs text-muted-foreground">TTFT {formatNumber(request.ttftMs)} · 재시도 {formatNumber(request.retryCount)}</span></TableCell>
                <TableCell className="text-right tabular-nums">{formatCost(request.costUsd, currency)}</TableCell>
                <TableCell className="text-right"><TraceDialog trace={request} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentErrorsTable({ currency, report }: { readonly currency: CostCurrency; readonly report: AiMonitorReport }) {
  const canGoBack = report.pagination.page > 1;
  const canGoForward = report.pagination.page < report.pagination.totalPages;
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 오류</CardTitle>
        <CardDescription>Timeout과 rate-limit을 포함한 최신 실패입니다. Trace 상세는 키보드로 열 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.recentErrors.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">선택한 조건의 오류가 없습니다.</p> : (
          <Table>
            <TableCaption>최근 오류 {report.pagination.totalItems}건 중 {report.recentErrors.length}건 표시</TableCaption>
            <TableHeader><TableRow>
              <TableHead scope="col">시각</TableHead><TableHead scope="col">Provider / Model</TableHead><TableHead scope="col">상태</TableHead><TableHead scope="col">오류</TableHead><TableHead scope="col" className="text-right">상세</TableHead>
            </TableRow></TableHeader>
            <TableBody>{report.recentErrors.map((error) => (
              <TableRow key={error.eventId}>
                <TableCell>{new Date(error.timestamp).toLocaleString("ko-KR", { timeZone: "UTC" })} UTC</TableCell>
                <TableCell><span className="font-medium">{error.provider}</span><br /><span className="text-xs text-muted-foreground">{error.model}</span></TableCell>
                <TableCell><Badge variant={outcomeBadge(error.outcome)}>{error.outcome}</Badge></TableCell>
                <TableCell><span className="font-medium">{error.errorType ?? "unknown"}</span><br /><span className="text-xs text-muted-foreground">{error.errorCode ?? "코드 없음"}</span></TableCell>
                <TableCell className="text-right"><TraceDialog trace={report.traces.find((trace) => trace.eventId === error.eventId)} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
        <nav aria-label="오류 목록 페이지" className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{report.pagination.page} / {report.pagination.totalPages} 페이지</p>
          <div className="flex gap-2">
            <Button asChild={canGoBack} disabled={!canGoBack} size="sm" variant="outline">{canGoBack ? <Link href={pageHref(report.filters, report.pagination.page - 1, currency)}>이전</Link> : <span>이전</span>}</Button>
            <Button asChild={canGoForward} disabled={!canGoForward} size="sm" variant="outline">{canGoForward ? <Link href={pageHref(report.filters, report.pagination.page + 1, currency)}>다음</Link> : <span>다음</span>}</Button>
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}
