import Link from "next/link";
import { Activity, FileBarChart, List, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DISPLAY_KRW_PER_USD } from "./monitor-currency";

export type MonitorSection = "overview" | "reports" | "logs";

const monitorSections = [
  { href: "/admin/ai-monitor", label: "모니터링 개요", section: "overview" as const, icon: Activity },
  { href: "/admin/ai-monitor/reports", label: "리포트", section: "reports" as const, icon: FileBarChart },
  { href: "/admin/ai-monitor/logs", label: "전체 로그", section: "logs" as const, icon: List },
];

export function MonitorNavigation({ active }: { readonly active: MonitorSection }) {
  return (
    <nav aria-label="AI 모니터 메뉴" className="border-b border-border">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {monitorSections.map((item) => {
          const Icon = item.icon;
          const isActive = item.section === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={isActive
                ? "inline-flex shrink-0 items-center gap-2 border-b-2 border-foreground px-3 py-3 text-sm font-semibold text-foreground"
                : "inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"}
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MonitorHeader({
  description,
  refreshHref,
  title,
}: {
  readonly description: string;
  readonly refreshHref: string;
  readonly title: string;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <Badge variant="outline">Preview fixture</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline">
        <Link href={refreshHref}><RefreshCw aria-hidden="true" />새로고침</Link>
      </Button>
    </header>
  );
}

export function MonitorSourceCard() {
  return (
    <Card className="border-chart-4/60 bg-chart-4/5">
      <CardContent className="space-y-2 pt-6 text-sm">
        <p className="font-medium text-foreground">현재 데이터 출처: Preview fixture</p>
        <p>현재 수치는 <code>ai-monitor/fixtures/events.json</code>의 테스트 이벤트를 서버에서 정규화한 값입니다. 실제 provider 호출이나 운영 DB에서 읽지 않습니다.</p>
        <p className="text-xs text-muted-foreground">모니터링 개요, 리포트, 전체 로그는 같은 fixture에서 계산됩니다. API 인증 경계는 모든 환경에서 401을 유지합니다.</p>
      </CardContent>
    </Card>
  );
}

export function MonitorCostDisclosure({ pricingVersions }: { readonly pricingVersions: readonly string[] }) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-6 text-xs text-muted-foreground">
        <p>가격 버전: {pricingVersions.join(", ") || "적용 데이터 없음"}</p>
        <p>비용은 provider token과 버전별 모델 단가를 바탕으로 한 추정값이며 청구서나 회계 수치가 아닙니다. KRW는 표시 환율 $1 = ₩{DISPLAY_KRW_PER_USD.toLocaleString("ko-KR")}로 환산합니다.</p>
        <p>사용자 원문, 입력·출력 내용, 사용자 식별자, 인증 정보는 조회하거나 응답하지 않습니다.</p>
      </CardContent>
    </Card>
  );
}
