"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDefaultAiUsageRange,
  type AiUsageControlSummary,
  type AiUsageDimensionMetric,
  type AiUsageHealth,
  type AiUsagePolicy,
  type AiUsageSummary,
} from "@/lib/ai-usage";

type DashboardResponse = AiUsageSummary & {
  range: { from: string; to: string };
  functionFilter: string;
  functionNames: string[];
  featureModels: AiUsageDimensionMetric[];
  controls: AiUsageControlSummary;
  policy: AiUsagePolicy;
  health: AiUsageHealth;
  limits: { maxRows: number; truncated: boolean };
};

type Filters = {
  from: string;
  to: string;
  functionFilter: string;
};

const initialRange = getDefaultAiUsageRange();
const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatLatency(value: number): string {
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} ms`;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(6)}`;
}

function formatOptionalLatency(value: number | null): string {
  return value === null ? "—" : formatLatency(value);
}

function healthLabel(status: AiUsageHealth["status"]): string {
  switch (status) {
    case "healthy":
      return "정상";
    case "warning":
      return "주의";
    case "critical":
      return "위험";
    default:
      return "확인 필요";
  }
}

function healthClass(status: AiUsageHealth["status"]): string {
  switch (status) {
    case "healthy":
      return "border-emerald-500/40 bg-emerald-500/5 text-emerald-700";
    case "warning":
      return "border-orange-500/40 bg-orange-500/5 text-orange-700";
    case "critical":
      return "border-destructive/50 bg-destructive/5 text-destructive";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AiUsagePage() {
  const [filters, setFilters] = useState<Filters>({
    ...initialRange,
    functionFilter: "all",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    ...initialRange,
    functionFilter: "all",
  });
  const [summary, setSummary] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams(appliedFilters);
      try {
        const response = await fetch(`/api/admin/ai-usage?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as DashboardResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "AI 운영 지표를 불러오지 못했습니다.");
        if (!cancelled) setSummary(data);
      } catch (loadError) {
        if (!cancelled) {
          setSummary(null);
          setError(loadError instanceof Error ? loadError.message : "AI 운영 지표를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUsage();
    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from > filters.to) {
      setError("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
    setAppliedFilters({ ...filters });
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const functionOptions = Array.from(
    new Set([
      ...(summary?.functionNames ?? []),
      filters.functionFilter !== "all" ? filters.functionFilter : "",
    ].filter(Boolean))
  );

  const healthStatus = summary?.health.status ?? "unknown";
  const healthIsCritical = healthStatus === "critical";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI 운영 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            AI 함수의 호출량, 실패율, 지연 시간과 비용 추정치를 확인합니다.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setAppliedFilters({ ...filters })}>
          새로고침
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>조회 조건</CardTitle>
          <CardDescription>기간은 UTC 날짜 기준이며 최대 31일까지 조회합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="ai-usage-from">시작일</Label>
              <Input
                id="ai-usage-from"
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-usage-to">종료일</Label>
              <Input
                id="ai-usage-to"
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-usage-function">함수</Label>
              <Select value={filters.functionFilter} onValueChange={(value) => updateFilter("functionFilter", value)}>
                <SelectTrigger id="ai-usage-function">
                  <SelectValue placeholder="전체 함수" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 함수</SelectItem>
                  {functionOptions.map((functionName) => (
                    <SelectItem key={functionName} value={functionName}>
                      {functionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">조회</Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">로딩 중...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="호출 수"
              value={formatNumber(summary.totals.calls)}
              description={`${summary.range.from} ~ ${summary.range.to}`}
            />
            <MetricCard
              title="실패율"
              value={formatPercent(summary.totals.failureRate)}
              description={`${formatNumber(summary.totals.failures)}건 실패`}
            />
            <MetricCard
              title="평균 latency"
              value={formatLatency(summary.totals.averageLatencyMs)}
              description={`${formatNumber(summary.totals.successes)}건 성공`}
            />
            <MetricCard
              title="예상 비용"
              value={formatCost(summary.totals.estimatedCostUsd)}
              description={`${formatNumber(summary.totals.unpricedCalls)}건은 비용 미확정`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="p95 latency"
              value={formatOptionalLatency(summary.health.p95LatencyMs)}
              description="관측된 AI 호출 latency의 95 percentile"
            />
            <MetricCard
              title="관측 coverage"
              value={summary.health.coveragePercent === null ? "—" : formatPercent(summary.health.coveragePercent)}
              description={`${formatNumber(summary.health.terminalEvents)} / ${formatNumber(summary.health.allowedReservations)} terminal events`}
            />
            <MetricCard
              title="Outcome · timeout"
              value={formatNumber(summary.totals.outcomeCounts.timeout)}
              description={`rate-limit ${formatNumber(summary.totals.outcomeCounts.rate_limited)}건 · blocked ${formatNumber(summary.totals.outcomeCounts.blocked)}건`}
            />
            <Card className={healthClass(healthStatus)}>
              <CardHeader className="pb-2">
                <CardDescription className="text-inherit">Sink health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthLabel(healthStatus)}</div>
                <p className="mt-1 text-xs">
                  {healthIsCritical
                    ? `${formatNumber(summary.health.missingTerminalEvents)}건 terminal event 누락`
                    : summary.health.sinkHealthy ? "관측 이벤트 흐름이 정상입니다." : "health RPC 또는 관측 증거를 확인하세요."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              title="통제 차단"
              value={formatNumber(summary.controls.blocked)}
              description="quota·rate·budget·hard cap 등"
            />
            <MetricCard
              title="Provider 오류"
              value={formatNumber(summary.controls.providerErrors)}
              description="비용 확정과 분리된 오류 이벤트"
            />
            <MetricCard
              title="Token 거부"
              value={formatNumber(summary.controls.usageRejected)}
              description="비정상·불일치 token 이벤트"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>비용 통제 정책</CardTitle>
              <CardDescription>
                예약 단계에서 provider 호출 전에 적용되는 DB 유효 정책입니다. {summary.policy.policyVersion} · {summary.policy.effectiveFrom}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <p>Rate: {formatNumber(summary.policy.requestsPerMinute)} / minute</p>
              <p>Quota: {formatNumber(summary.policy.requestsPerDay)} / UTC day</p>
              <p>Concurrent: {formatNumber(summary.policy.concurrentRequests)}</p>
              <p>Budget: {formatCost(summary.policy.budgetUsdPerDay)} / day</p>
              <p>Hard cap: {formatCost(summary.policy.hardCapUsdPerDay)} / day</p>
              <p>Warning {summary.policy.warningPercent}% · Critical {summary.policy.criticalPercent}%</p>
            </CardContent>
          </Card>

          {summary.limits.truncated && (
            <p className="text-sm text-orange-600">
              조회 행이 {formatNumber(summary.limits.maxRows)}건으로 제한되었습니다. 더 짧은 기간으로 다시 조회하세요.
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>함수별 운영 지표</CardTitle>
              <CardDescription>선택한 기간의 함수별 호출·실패·latency·비용 추정치입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.functions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">선택한 조건의 AI 사용 로그가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-2 py-3">함수</th>
                        <th className="px-2 py-3 text-right">호출</th>
                        <th className="px-2 py-3 text-right">실패율</th>
                        <th className="px-2 py-3 text-right">평균 latency</th>
                        <th className="px-2 py-3 text-right">p95 latency</th>
                        <th className="px-2 py-3 text-right">예상 비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.functions.map((metric) => (
                        <tr key={metric.functionName} className="border-b border-border last:border-0">
                          <td className="px-2 py-3 font-medium text-foreground">{metric.functionName}</td>
                          <td className="px-2 py-3 text-right">{formatNumber(metric.calls)}</td>
                          <td className="px-2 py-3 text-right">{formatPercent(metric.failureRate)}</td>
                          <td className="px-2 py-3 text-right">{formatLatency(metric.averageLatencyMs)}</td>
                          <td className="px-2 py-3 text-right">{formatLatency(metric.p95LatencyMs)}</td>
                          <td className="px-2 py-3 text-right">{formatCost(metric.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature·model별 지표</CardTitle>
              <CardDescription>사용자 원문 없이 호출 표면과 모델 단위로 집계합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.featureModels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">표시할 feature·model 데이터가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-2 py-3">Feature</th>
                        <th className="px-2 py-3">Model</th>
                        <th className="px-2 py-3 text-right">호출</th>
                        <th className="px-2 py-3 text-right">입력 추정</th>
                        <th className="px-2 py-3 text-right">미확정 비용</th>
                        <th className="px-2 py-3 text-right">예상 비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.featureModels.map((metric) => (
                        <tr key={`${metric.feature}-${metric.model}`} className="border-b border-border last:border-0">
                          <td className="px-2 py-3 font-medium text-foreground">{metric.feature}</td>
                          <td className="px-2 py-3 text-muted-foreground">{metric.model}</td>
                          <td className="px-2 py-3 text-right">{formatNumber(metric.calls)}</td>
                          <td className="px-2 py-3 text-right">{formatNumber(metric.estimatedCalls)}</td>
                          <td className="px-2 py-3 text-right">{formatNumber(metric.unpricedCalls)}</td>
                          <td className="px-2 py-3 text-right">{formatCost(metric.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>일별 추이</CardTitle>
              <CardDescription>선택한 기간의 일별 호출 수와 실패율입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.daily.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">표시할 일별 데이터가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-2 py-3">날짜</th>
                        <th className="px-2 py-3 text-right">호출</th>
                        <th className="px-2 py-3 text-right">실패율</th>
                        <th className="px-2 py-3 text-right">평균 latency</th>
                        <th className="px-2 py-3 text-right">p95 latency</th>
                        <th className="px-2 py-3 text-right">예상 비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.daily.map((metric) => (
                        <tr key={metric.date} className="border-b border-border last:border-0">
                          <td className="px-2 py-3 font-medium text-foreground">{metric.date}</td>
                          <td className="px-2 py-3 text-right">{formatNumber(metric.calls)}</td>
                          <td className="px-2 py-3 text-right">{formatPercent(metric.failureRate)}</td>
                          <td className="px-2 py-3 text-right">{formatLatency(metric.averageLatencyMs)}</td>
                          <td className="px-2 py-3 text-right">{formatLatency(metric.p95LatencyMs)}</td>
                          <td className="px-2 py-3 text-right">{formatCost(metric.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-6 text-xs text-muted-foreground">
              <p>비용은 함수 로그의 provider token과 모델 단가를 바탕으로 한 추정값이며 청구서나 회계 수치가 아닙니다.</p>
              <p>개인 원문, 입력·출력 내용, 사용자 식별자는 이 화면의 API에서 조회하거나 응답하지 않습니다.</p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
