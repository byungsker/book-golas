"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

type WaitlistEntry = {
  id: string;
  email: string;
  locale: "ko" | "en";
  source: string | null;
  user_agent: string | null;
  created_at: string;
};

type LocaleFilter = "all" | "ko" | "en";

const PAGE_SIZE = 50;

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>("all");
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("waitlist")
      .select("id, email, locale, source, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (fetchError) {
      setError(fetchError.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as WaitlistEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (localeFilter !== "all" && entry.locale !== localeFilter) return false;
      if (term && !entry.email.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [entries, search, localeFilter]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = entries.filter(
      (e) => new Date(e.created_at) >= today,
    ).length;
    return {
      total: entries.length,
      ko: entries.filter((e) => e.locale === "ko").length,
      en: entries.filter((e) => e.locale === "en").length,
      today: todayCount,
    };
  }, [entries]);

  const pagedEntries = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [page, totalPages]);

  async function handleDelete(id: string, email: string) {
    if (!confirm(`${email} 을(를) 명단에서 삭제할까요?`)) return;
    setDeletingId(id);
    const { error: deleteError } = await supabase
      .from("waitlist")
      .delete()
      .eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      alert("삭제 실패: " + deleteError.message);
      return;
    }
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function exportCsv() {
    const header = ["email", "locale", "source", "created_at"];
    const rows = filtered.map((e) =>
      [e.email, e.locale, e.source ?? "", e.created_at].map(csvEscape).join(","),
    );
    const csv = [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("ko-KR", {
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">출시 알림 명단</h1>
          <p className="text-sm text-muted-foreground">
            iOS 출시 알림 신청자 (BOK-371)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "불러오는 중..." : "새로고침"}
          </Button>
          <Button onClick={exportCsv} disabled={filtered.length === 0}>
            CSV 내보내기 ({filtered.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="총 신청자" value={stats.total} />
        <StatCard label="오늘" value={stats.today} accent="primary" />
        <StatCard label="한국어" value={stats.ko} />
        <StatCard label="English" value={stats.en} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>명단</CardTitle>
          <CardDescription>
            이메일 검색 + 언어 필터로 좁혀보세요. 최대 1,000건까지 조회합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="이메일 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="sm:max-w-xs"
            />
            <Select
              value={localeFilter}
              onValueChange={(value) => {
                setLocaleFilter(value as LocaleFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="언어" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              조회 실패: {error}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead className="w-24">언어</TableHead>
                  <TableHead className="w-28">출처</TableHead>
                  <TableHead className="w-44">신청일</TableHead>
                  <TableHead className="w-24 text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      불러오는 중...
                    </TableCell>
                  </TableRow>
                ) : pagedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      신청자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">{entry.email}</TableCell>
                      <TableCell>
                        <Badge variant={entry.locale === "ko" ? "default" : "secondary"}>
                          {entry.locale.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.source ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id, entry.email)}
                          disabled={deletingId === entry.id}
                        >
                          {deletingId === entry.id ? "삭제 중..." : "삭제"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  이전
                </Button>
                <span className="px-2 py-1.5 text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={
            accent === "primary"
              ? "mt-1 text-2xl font-bold text-primary"
              : "mt-1 text-2xl font-bold text-foreground"
          }
        >
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
