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
import { supabase, PushLog } from "@/lib/supabase";

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

export default function PushLogsPage() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const pageSize = 20;

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

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, page]);

  async function fetchLogs() {
    try {
      setLoading(true);
      let query = supabase
        .from("push_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (typeFilter !== "all") {
        query = query.eq("push_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
      setHasMore((data?.length || 0) === pageSize);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
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
                        {formatDate(log.sent_at)}
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
                        {log.is_clicked ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
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
