"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { PushAnnouncement } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<PushAnnouncement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from("push_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAnnouncements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      setResult({ type: "error", message: "제목과 내용을 모두 입력해주세요." });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/send-bulk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          type: "success",
          message: `발송 완료! (총 ${data.total}명, 성공 ${data.sent}, 실패 ${data.failed})`,
        });
        setTitle("");
        setBody("");
        await loadAnnouncements();
      } else {
        setResult({
          type: "error",
          message: "발송 실패: " + (data.error || JSON.stringify(data)),
        });
      }
    } catch (err) {
      setResult({
        type: "error",
        message:
          "네트워크 오류: " +
          (err instanceof Error ? err.message : String(err)),
      });
    }

    setSending(false);
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

  function getStatusBadge(status: string) {
    switch (status) {
      case "sending":
        return <Badge variant="outline" className="text-blue-700 dark:text-blue-400 border-blue-500/40 bg-blue-500/10">발송 중</Badge>;
      case "sent":
        return <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/40 bg-green-500/10">완료</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-700 dark:text-red-400 border-red-500/40 bg-red-500/10">실패</Badge>;
      default:
        return <Badge variant="outline">대기</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">공지 발송</h1>
        <p className="text-muted-foreground">
          전체 회원에게 공지 푸시 알림을 발송합니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>새 공지사항</CardTitle>
            <CardDescription>
              제목과 내용을 입력하고 발송하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지 제목 입력"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">내용</Label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="공지 내용 입력"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-vertical"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full"
            >
              {sending ? "발송 중..." : "📢 전체 회원에게 발송"}
            </Button>

            {result && (
              <div
                className={`p-3 rounded-md text-sm ${
                  result.type === "success"
                    ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                {result.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>미리보기</CardTitle>
            <CardDescription>발송될 푸시 알림 미리보기</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg max-w-sm">
              <div className="flex items-start gap-3">
                <img src="/logo-bookgolas.png" alt="북골라스" className="w-10 h-10 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">북골라스</span>
                    <span className="text-xs text-gray-400">now</span>
                  </div>
                  <p className="font-medium text-sm mt-1">
                    {title || "(제목 미입력)"}
                  </p>
                  <p className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap">
                    {body || "(내용 미입력)"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">발송 안내</p>
              <p>대상: FCM 토큰이 등록된 전체 회원</p>
              <p>방식: 전체 일괄 발송 (5명씩 병렬 처리)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>발송 이력</CardTitle>
          <CardDescription>
            총 {announcements.length}건의 발송 이력
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                아직 발송 이력이 없습니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상태</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead className="text-center">대상</TableHead>
                  <TableHead className="text-center">성공</TableHead>
                  <TableHead className="text-center">실패</TableHead>
                  <TableHead>발송일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{getStatusBadge(a.status)}</TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">
                      {a.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[220px] truncate">
                      {a.body}
                    </TableCell>
                    <TableCell className="text-center">
                      {a.total_count}
                    </TableCell>
                    <TableCell className="text-center text-green-700 dark:text-green-500">
                      {a.sent_count}
                    </TableCell>
                    <TableCell
                      className={`text-center ${
                        a.failed_count > 0
                          ? "text-red-700 dark:text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {a.failed_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {a.sent_at ? formatDate(a.sent_at) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
