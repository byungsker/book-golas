"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  BrainCircuit,
  Database,
  Megaphone,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatGeneratedAt,
  formatMetric,
  formatPercentage,
  getNextAction,
  percentage,
} from "@/lib/admin/monitoring";
import type {
  AdminMonitoringMetrics,
  MetricValue,
} from "@/types/monitoring";

type MetricCardProps = {
  label: string;
  value: MetricValue;
  description: string;
  icon: React.ReactNode;
};

function MetricCard({ label, value, description, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-primary">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {formatMetric(value)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({
  initialMetrics = null,
}: {
  initialMetrics?: AdminMonitoringMetrics | null;
}) {
  const [metrics, setMetrics] = useState<AdminMonitoringMetrics | null>(
    initialMetrics
  );
  const [loading, setLoading] = useState(initialMetrics === null);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/monitoring", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("성장 데이터를 불러오지 못했습니다.");
      }

      setMetrics((await response.json()) as AdminMonitoringMetrics);
    } catch {
      setError("데이터 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialMetrics === null) {
      loadMetrics();
    }
  }, [initialMetrics, loadMetrics]);

  const insight = useMemo(
    () => (metrics ? getNextAction(metrics) : null),
    [metrics]
  );

  if (loading && !metrics) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        성장 지표를 불러오는 중...
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>성장 데이터를 연결하지 못했습니다</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={loadMetrics} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bookActivation = percentage(
    metrics.books.users_with_books,
    metrics.users.total
  );
  const readingActivation = percentage(
    metrics.reading.users_with_records,
    metrics.users.total
  );
  const recallActivation = percentage(
    metrics.recall.users_with_recall,
    metrics.users.total
  );
  const pushCtr = percentage(
    metrics.push.clicked_7d,
    metrics.push.sent_7d
  );
  const generatedAt = formatGeneratedAt(metrics.generated_at);
  const lowSample =
    metrics.users.active_7d !== null && metrics.users.active_7d < 30;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              성장·운영 대시보드
            </h1>
            <Badge
              variant={
                metrics.source_status === "connected" ? "default" : "outline"
              }
            >
              {metrics.source_status === "connected"
                ? "제품 데이터 연결됨"
                : "일부 데이터 연결 필요"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            최근 {metrics.period_days}일 제품 행동을 개인정보 없이 집계합니다.
            마지막 갱신 {generatedAt}
          </p>
        </div>
        <Button onClick={loadMetrics} variant="outline" disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          새로고침
        </Button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error} 아래 수치는 마지막 성공 갱신 시점의 값입니다.
        </div>
      )}

      {metrics.source_status === "partial" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          고유 사용자 기반 지표는 성장 집계 RPC 배포 후 표시됩니다. 연결되지
          않은 값은 0이 아니라 ‘연결 필요’로 표시합니다.
        </div>
      )}

      {lowSample && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300">
          최근 7일 활성 사용자가 30명 미만이라 비율 변화가 크게 흔들릴 수
          있습니다. 현재 수치는 방향 탐색용으로만 사용하세요.
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">최근 7일 핵심 행동</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="신규 사용자"
            value={metrics.users.new_7d}
            description="최근 7일 가입"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="활성 사용자"
            value={metrics.users.active_7d}
            description="책·독서 기록·Recall 행동의 고유 사용자"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="등록한 책"
            value={metrics.books.created_7d}
            description="최근 7일 새 책 등록"
            icon={<BookOpen className="h-4 w-4" />}
          />
          <MetricCard
            label="독서 기록"
            value={metrics.reading.records_7d}
            description="최근 7일 진행 기록"
            icon={<Sparkles className="h-4 w-4" />}
          />
          <MetricCard
            label="AI Recall"
            value={metrics.recall.created_7d}
            description="최근 7일 Recall 검색"
            icon={<BrainCircuit className="h-4 w-4" />}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">누적 활성화 흐름</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                label: "가입 → 책 등록 경험",
                value: bookActivation,
                detail: `${formatMetric(metrics.books.users_with_books)} / ${formatMetric(metrics.users.total)}명`,
              },
              {
                label: "가입 → 독서 기록 경험",
                value: readingActivation,
                detail: `${formatMetric(metrics.reading.users_with_records)} / ${formatMetric(metrics.users.total)}명`,
              },
              {
                label: "가입 → AI Recall 경험",
                value: recallActivation,
                detail: `${formatMetric(metrics.recall.users_with_recall)} / ${formatMetric(metrics.users.total)}명`,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {formatPercentage(item.value)} · {item.detail}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${item.value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              이 비율은 동일 기간 코호트가 아닌 누적 경험 비율입니다. 원인이나
              전환 효과로 해석하지 마세요.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              다음 관찰 우선순위
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{insight?.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {insight?.description}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-primary" />
              푸시 반응
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">7일 발송</p>
              <p className="mt-1 text-2xl font-bold">
                {formatMetric(metrics.push.sent_7d)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">7일 클릭</p>
              <p className="mt-1 text-2xl font-bold">
                {formatMetric(metrics.push.clicked_7d)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="mt-1 text-2xl font-bold">
                {formatPercentage(pushCtr)}
              </p>
            </div>
            <p className="col-span-3 text-xs text-muted-foreground">
              푸시 CTR은 독서 가치나 리텐션을 직접 증명하지 않습니다. 발송
              빈도와 메시지 품질을 점검하는 운영 지표로만 사용하세요.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              데이터 상태
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>제품 행동 · Supabase</span>
              <Badge variant="outline">
                {metrics.source_status === "connected" ? "연결됨" : "부분 연결"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>앱스토어 유입 · App Store Connect</span>
              <Badge variant="secondary">외부 확인</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>광고 수익 · AdMob</span>
              <Badge variant="secondary">Company Control Plane</Badge>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              이 화면은 집계값만 반환하며 이메일, 책 제목, 독서 메모, 검색
              내용은 조회하지 않습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
