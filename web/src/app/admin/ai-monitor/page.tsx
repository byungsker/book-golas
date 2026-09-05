import "server-only";

import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AiMonitorQueryError,
  DEFAULT_MONITOR_RANGE,
  loadAiMonitorReport,
  parseAiMonitorFilters,
  type AiMonitorFilters,
  type AiMonitorReport,
} from "@/lib/ai-monitor";
import { isAiMonitorDemoRequest } from "@/lib/ai-monitor-access";
import { MonitorOverview } from "./monitor-overview";
import { RecentErrorsTable, TrendTable } from "./monitor-tables";

type PageProps = {
  readonly searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
};

function FilterSelect(props: {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly allLabel: string;
  readonly options: readonly string[];
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select name={props.name} defaultValue={props.value}>
        <SelectTrigger id={props.id} className="w-full min-w-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{props.allLabel}</SelectItem>
          {props.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function FiltersCard({ filters, report }: { readonly filters: AiMonitorFilters; readonly report: AiMonitorReport | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>조회 조건</CardTitle>
        <CardDescription>UTC 기준 최대 31일입니다. 조건은 URL에 남아 같은 화면을 다시 열 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="get" className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 space-y-2"><Label htmlFor="monitor-from">시작일</Label><Input id="monitor-from" name="from" type="date" defaultValue={filters.from} /></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="monitor-to">종료일</Label><Input id="monitor-to" name="to" type="date" defaultValue={filters.to} /></div>
          <FilterSelect id="monitor-provider" name="provider" label="Provider" value={filters.provider} allLabel="전체 provider" options={report?.options.providers ?? []} />
          <FilterSelect id="monitor-model" name="model" label="Model" value={filters.model} allLabel="전체 model" options={report?.options.models ?? []} />
          <FilterSelect id="monitor-status" name="status" label="Status" value={filters.status} allLabel="전체 status" options={["success", "failure", "cancelled"]} />
          <FilterSelect id="monitor-outcome" name="outcome" label="Outcome" value={filters.outcome} allLabel="전체 outcome" options={["success", "failure", "timeout", "rate_limited", "cancelled"]} />
          <FilterSelect id="monitor-error-type" name="errorType" label="Error type" value={filters.errorType} allLabel="전체 오류 유형" options={["provider_error", "timeout", "rate_limit", "cancelled"]} />
          <div className="flex min-w-0 items-end"><Button type="submit" className="w-full">조회</Button></div>
          <input type="hidden" name="pageSize" value={filters.pageSize} />
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AiMonitorPage({ searchParams }: PageProps) {
  const requestHeaders = await headers();
  if (!isAiMonitorDemoRequest(requestHeaders.get("host"))) {
    redirect("/admin/login?error=admin_disabled");
  }

  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
  }

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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Web AI Monitoring</h1>
            <Badge variant="outline">Preview fixture</Badge>
          </div>
          <p className="text-sm text-muted-foreground">AI 요청, 토큰, 비용, 지연과 실패 trace를 한 화면에서 점검합니다.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/ai-monitor"><RefreshCw aria-hidden="true" />새로고침</Link></Button>
      </header>

      <Card className="border-chart-4/60 bg-chart-4/5">
        <CardContent className="pt-6 text-sm">
          이 화면은 개발 환경의 loopback 또는 보호된 Vercel Preview에서만 fixture를 서버 렌더링합니다. API 인증 경계는 모든 환경에서 401을 유지합니다.
        </CardContent>
      </Card>

      <FiltersCard filters={filters} report={report} />

      {errorMessage ? (
        <Card role="alert" className="border-destructive/50 bg-destructive/5">
          <CardHeader><CardTitle>데이터를 표시할 수 없습니다</CardTitle><CardDescription className="text-destructive">{errorMessage}</CardDescription></CardHeader>
        </Card>
      ) : report ? (
        <>
          <MonitorOverview report={report} />
          <TrendTable report={report} />
          <RecentErrorsTable report={report} />
          <Card>
            <CardHeader><CardTitle>가격·개인정보 안내</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>가격 버전: {report.pricingVersions.join(", ") || "적용 데이터 없음"}</p>
              <p>비용은 provider token과 버전별 모델 단가를 바탕으로 한 추정값이며 청구서나 회계 수치가 아닙니다.</p>
              <p>사용자 원문, 입력·출력 내용, 사용자 식별자, 인증 정보는 조회하거나 응답하지 않습니다.</p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
