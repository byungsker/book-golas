import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AiMonitorFilters, AiMonitorReport } from "@/lib/ai-monitor";
import type { CostCurrency } from "./monitor-currency";
import { Button } from "@/components/ui/button";

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

export function MonitorFiltersCard({
  currency,
  filters,
  pathname,
  report,
}: {
  readonly currency: CostCurrency;
  readonly filters: AiMonitorFilters;
  readonly pathname: string;
  readonly report: AiMonitorReport | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>조회 조건</CardTitle>
        <CardDescription>UTC 기준 최대 31일입니다. 조건은 URL에 남아 같은 화면을 다시 열 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="get" action={pathname} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 space-y-2"><Label htmlFor="monitor-from">시작일</Label><Input id="monitor-from" name="from" type="date" defaultValue={filters.from} /></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="monitor-to">종료일</Label><Input id="monitor-to" name="to" type="date" defaultValue={filters.to} /></div>
          <FilterSelect id="monitor-provider" name="provider" label="Provider" value={filters.provider} allLabel="전체 provider" options={report?.options.providers ?? []} />
          <FilterSelect id="monitor-model" name="model" label="Model" value={filters.model} allLabel="전체 model" options={report?.options.models ?? []} />
          <FilterSelect id="monitor-status" name="status" label="Status" value={filters.status} allLabel="전체 status" options={["success", "failure", "cancelled"]} />
          <FilterSelect id="monitor-outcome" name="outcome" label="Outcome" value={filters.outcome} allLabel="전체 outcome" options={["success", "failure", "timeout", "rate_limited", "cancelled"]} />
          <FilterSelect id="monitor-error-type" name="errorType" label="Error type" value={filters.errorType} allLabel="전체 오류 유형" options={["provider_error", "timeout", "rate_limit", "cancelled"]} />
          <div className="flex min-w-0 items-end"><Button type="submit" className="w-full">조회</Button></div>
          <input type="hidden" name="pageSize" value={filters.pageSize} />
          <input type="hidden" name="currency" value={currency} />
        </form>
      </CardContent>
    </Card>
  );
}
