import "server-only";

import { loadAiMonitorReport, MAX_PAGE_SIZE, parseAiMonitorFilters, type AiMonitorFilters, type AiMonitorReport } from "@/lib/ai-monitor";
import { parseCostCurrency } from "../monitor-currency";
import { requireAiMonitorPreview } from "../monitor-access";
import { MonitorCostDisclosure, MonitorHeader, MonitorNavigation, MonitorSourceCard } from "../monitor-shell";
import { MonitorFiltersCard } from "../monitor-filters";
import { RequestLogTable } from "../monitor-tables";

type PageProps = {
  readonly searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
};

function toSearchParams(rawParams: Record<string, string | readonly string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

export default async function AiMonitorLogsPage({ searchParams }: PageProps) {
  await requireAiMonitorPreview();
  const params = toSearchParams(await searchParams);
  if (!params.has("pageSize")) params.set("pageSize", String(MAX_PAGE_SIZE));
  const currency = parseCostCurrency(params.get("currency"));
  const query = params.toString();
  let filters: AiMonitorFilters;
  let report: AiMonitorReport | null = null;
  let errorMessage: string | null = null;
  try {
    filters = parseAiMonitorFilters(params);
    report = await loadAiMonitorReport(filters);
  } catch (error) {
    filters = parseAiMonitorFilters(new URLSearchParams({ pageSize: String(MAX_PAGE_SIZE) }));
    errorMessage = error instanceof Error ? `로그 조회 조건을 확인하세요: ${error.message}` : "전체 로그를 불러오지 못했습니다.";
  }

  return (
    <div className="space-y-6">
      <MonitorHeader title="전체 로그" description="선택한 조건에 포함된 모든 AI 요청을 건별로 확인하고 집계와 대조합니다." refreshHref="/admin/ai-monitor/logs" query={query} />
      <MonitorNavigation active="logs" query={query} />
      <MonitorSourceCard />
      <MonitorFiltersCard filters={filters} report={report} currency={currency} pathname="/admin/ai-monitor/logs" />
      {errorMessage ? <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{errorMessage}</p> : null}
      {report ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="font-semibold text-foreground">전체 요청 로그</h2><p className="text-sm text-muted-foreground">현재 조건에 맞는 {report.requestLogs.length.toLocaleString("ko-KR")}건 · Event ID와 Trace로 수치를 대조할 수 있습니다.</p></div>
          </div>
          <RequestLogTable title="전체 요청 로그" description="최근 오류만이 아니라 현재 조회 조건에 포함된 모든 정규화 요청입니다. 원시 입력·출력은 표시하지 않습니다." report={report} currency={currency} pathname="/admin/ai-monitor/logs" query={params.toString()} />
          <MonitorCostDisclosure pricingVersions={report.pricingVersions} />
        </>
      ) : null}
    </div>
  );
}
