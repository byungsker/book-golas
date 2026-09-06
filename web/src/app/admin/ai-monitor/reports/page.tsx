import "server-only";

import { DEFAULT_MONITOR_RANGE, loadAiMonitorReport } from "@/lib/ai-monitor";
import { parseCostCurrency } from "../monitor-currency";
import { requireAiMonitorPreview } from "../monitor-access";
import { buildMonitorInsights, buildReportRows, MonitorReportQueryError, parseMonitorReportRange, reportFilters, type MonitorReportRange } from "@/lib/ai-monitor-reports";
import { MonitorCostDisclosure, MonitorHeader, MonitorNavigation, MonitorSourceCard } from "../monitor-shell";
import { ReportInsights, ReportPeriodSelector, ReportSummary, ReportTable } from "../report-components";

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

function fallbackRange(): MonitorReportRange {
  return { period: "day", from: DEFAULT_MONITOR_RANGE.from, to: DEFAULT_MONITOR_RANGE.to };
}

export default async function AiMonitorReportsPage({ searchParams }: PageProps) {
  await requireAiMonitorPreview();
  const params = toSearchParams(await searchParams);
  const currency = parseCostCurrency(params.get("currency"));
  let range: MonitorReportRange;
  let report;
  let errorMessage: string | null = null;
  try {
    range = parseMonitorReportRange(params);
    report = await loadAiMonitorReport(reportFilters(range));
  } catch (error) {
    range = fallbackRange();
    report = await loadAiMonitorReport(reportFilters(range));
    errorMessage = error instanceof MonitorReportQueryError ? `리포트 조건이 올바르지 않습니다: ${error.field}` : "리포트 데이터를 불러오지 못했습니다.";
  }
  const rows = buildReportRows(report, range.period);

  return (
    <div className="space-y-6">
      <MonitorHeader title="리포트" description="일·월·분기·연간 기준으로 AI 사용량을 비교하고 개선 액션을 찾습니다." refreshHref="/admin/ai-monitor/reports" />
      <MonitorNavigation active="reports" />
      <MonitorSourceCard />
      <ReportPeriodSelector currency={currency} range={range} />
      {errorMessage ? <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{errorMessage}</p> : null}
      <ReportSummary report={report} currency={currency} />
      <ReportInsights insights={buildMonitorInsights(report)} />
      <ReportTable rows={rows} currency={currency} pathname="/admin/ai-monitor/reports" query={params.toString()} />
      <MonitorCostDisclosure pricingVersions={report.pricingVersions} />
    </div>
  );
}
