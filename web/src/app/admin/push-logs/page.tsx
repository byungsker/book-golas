"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PushLog } from "@/lib/supabase";
import type { PushOpsSummary } from "@/lib/push-ops";

const PUSH_TYPES = [
  { value: "all", label: "전체" },
  { value: "inactive", label: "Inactive" },
  { value: "deadline", label: "Deadline" },
  { value: "progress", label: "Progress" },
  { value: "streak", label: "Streak" },
  { value: "achievement", label: "Achievement" },
  { value: "announcement", label: "Announcement" },
  { value: "test", label: "Test" },
];

type PushSummaryResponse = {
  range: { from: string; to: string };
  summary: PushOpsSummary;
  limits: { maxRows: number; truncated: boolean };
};

function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function PushLogsPage() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<PushSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadEmails = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/fcm-tokens");
      const data = await response.json();
      if (data.users) {
        const map: Record<string, string> = {};
        data.users.forEach((u: { user_id: string; email: string }) => {
          map[u.user_id] = u.email;
        });
        setEmailMap(map);
      }
    } catch (error) {
      console.error("Failed to fetch user emails:", error);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const params = new URLSearchParams({ summary: "1", type: typeFilter });
      const response = await fetch(`/api/admin/push-logs?${params}`);
      const data = (await response.json()) as PushSummaryResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to fetch push summary");
      setSummary(data);
    } catch (error) {
      setSummary(null);
      setSummaryError(error instanceof Error ? error.message : "Failed to fetch push summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), type: typeFilter });
      const response = await fetch(`/api/admin/push-logs?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch logs");
      setLogs(data.logs || []);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchLogs(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">발송 로그</h1>
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="타입 필터" />
            </SelectTrigger>
            <SelectContent>
              {PUSH_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summaryLoading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">운영 요약 로딩 중...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SummaryCard
              title="발송 성공률"
              value={`${summary.summary.successRate}%`}
              detail={`${summary.summary.sent}건 성공 / ${summary.summary.deliveryAttempts}건 시도`}
            />
            <SummaryCard
              title="실패율"
              value={`${summary.summary.failureRate}%`}
              detail={`${summary.summary.failed}건 실패`}
            />
            <SummaryCard
              title="Invalid token"
              value={String(summary.summary.invalidTokenCount)}
              detail="정리 대상으로 기록된 토큰"
            />
            <SummaryCard
              title="CTR"
              value={`${summary.summary.clickThroughRate}%`}
              detail={`${summary.summary.clicked}건 클릭 / 성공 발송`}
            />
            <SummaryCard
              title="Dedupe hit"
              value={String(summary.summary.dedupeHits)}
              detail={`${summary.summary.skipped}건 발송 건너뜀`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>집계 기간: {summary.range.from} ~ {summary.range.to} (UTC)</span>
            <span>대기 중: {summary.summary.pending}건</span>
            {summary.limits.truncated && (
              <span className="text-orange-600">최근 {summary.limits.maxRows}건으로 제한됨</span>
            )}
          </div>
          {summary.summary.failureReasons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>최근 실패 원인</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {summary.summary.failureReasons.map((reason) => (
                  <Badge key={reason.code} variant="outline">
                    {reason.code}: {reason.count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : summaryError ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{summaryError}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            로그 목록
            {typeFilter !== "all" && (
              <Badge variant="secondary" className="ml-2">
                {typeFilter}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              발송 로그가 없습니다
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">발송 시간</TableHead>
                    <TableHead className="w-48">사용자</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-28 text-center">상태</TableHead>
                    <TableHead className="w-44">클릭 시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.sent_at ?? log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="text-foreground">
                          {emailMap[log.user_id] || log.user_id.slice(0, 8) + "..."}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.push_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.title || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.delivery_status === "failed" ? (
                          <span className="font-medium text-red-400">
                            실패{log.failure_code ? ` (${log.failure_code})` : ""}
                          </span>
                        ) : log.delivery_status === "skipped" ? (
                          <span className="text-muted-foreground">중복 건너뜀</span>
                        ) : log.delivery_status === "pending" ? (
                          <span className="text-orange-400">처리 중</span>
                        ) : log.is_clicked ? (
                          <span className="text-green-400 font-medium">
                            ✅ Clicked
                          </span>
                        ) : (
                          <span className="text-muted-foreground">⏳ Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.clicked_at ? formatDate(log.clicked_at) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← 이전
                </Button>
                <span className="text-sm text-muted-foreground">
                  페이지 {page + 1}
                </span>
                <Button
                  variant="outline"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음 →
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
