import "server-only";

import {
  AiMonitorQueryError,
  DEFAULT_MONITOR_RANGE,
  loadAiMonitorReport,
  parseAiMonitorFilters,
  type AiMonitorFilters,
  type AiMonitorReport,
} from "@/lib/ai-monitor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorFiltersCard } from "./monitor-filters";
import { parseCostCurrency } from "./monitor-currency";
import { requireAiMonitorPreview } from "./monitor-access";
import { MonitorOverview } from "./monitor-overview";
import { FeatureModelTable, RecentErrorsTable, RequestLogTable, TrendTable } from "./monitor-tables";
import { MonitorCostDisclosure, MonitorHeader, MonitorNavigation, MonitorSourceCard } from "./monitor-shell";

type PageProps = {
  readonly searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
};

export default async function AiMonitorPage({ searchParams }: PageProps) {
  await requireAiMonitorPreview();

  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const currency = parseCostCurrency(params.get("currency"));
  const query = params.toString();

  let report: AiMonitorReport | null = null;
  let errorMessage: string | null = null;
  let filters: AiMonitorFilters;
  try {
    filters = parseAiMonitorFilters(params);
    report = await loadAiMonitorReport(filters);
  } catch (error) {
    filters = parseAiMonitorFilters(new URLSearchParams(DEFAULT_MONITOR_RANGE));
    errorMessage = error instanceof AiMonitorQueryError
      ? `조회 조건이 올바르지 않습니다: ${error.field}`
      : "AI 모니터 데이터를 불러오지 못했습니다.";
  }

  return (
    <div className="space-y-6">
      <MonitorHeader title="모니터링 개요" description="AI 요청의 상태, latency, 토큰, 비용과 Provider 연결을 한 화면에서 점검합니다." refreshHref="/admin/ai-monitor" />
      <MonitorNavigation active="overview" />
      <MonitorSourceCard />
      <MonitorFiltersCard filters={filters} report={report} currency={currency} pathname="/admin/ai-monitor" />

      {errorMessage ? (
        <Card role="alert" className="border-destructive/50 bg-destructive/5">
          <CardHeader><CardTitle>데이터를 표시할 수 없습니다</CardTitle><CardDescription className="text-destructive">{errorMessage}</CardDescription></CardHeader>
        </Card>
      ) : report ? (
        <>
          <MonitorOverview report={report} currency={currency} pathname="/admin/ai-monitor" query={query} />
          <FeatureModelTable report={report} currency={currency} pathname="/admin/ai-monitor" query={query} />
          <RequestLogTable report={report} currency={currency} pathname="/admin/ai-monitor" query={query} />
          <TrendTable report={report} currency={currency} pathname="/admin/ai-monitor" query={query} />
          <RecentErrorsTable report={report} currency={currency} />
          <MonitorCostDisclosure pricingVersions={report.pricingVersions} />
        </>
      ) : null}
    </div>
  );
}
