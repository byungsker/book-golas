"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase, PushLog } from "@/lib/supabase";

type DashboardStats = {
  todaySent: number;
  todayClicked: number;
  ctr: number;
  activeUsers: number;
  fatigueUsers: number;
};

type TypeStats = {
  push_type: string;
  sent: number;
  clicked: number;
  ctr: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySent: 0,
    todayClicked: 0,
    ctr: 0,
    activeUsers: 0,
    fatigueUsers: 0,
  });
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [recentLogs, setRecentLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: todayLogs } = await supabase
        .from("push_logs")
        .select("*")
        .gte("sent_at", today);

      if (todayLogs) {
        const sent = todayLogs.length;
        const clicked = todayLogs.filter((l) => l.is_clicked).length;
        setStats({
          todaySent: sent,
          todayClicked: clicked,
          ctr: sent > 0 ? Math.round((clicked / sent) * 100 * 10) / 10 : 0,
          activeUsers: new Set(todayLogs.map((l) => l.user_id)).size,
          fatigueUsers: 0,
        });

        const typeMap = new Map<string, { sent: number; clicked: number }>();
        todayLogs.forEach((log) => {
          const curr = typeMap.get(log.push_type) || { sent: 0, clicked: 0 };
          curr.sent++;
          if (log.is_clicked) curr.clicked++;
          typeMap.set(log.push_type, curr);
        });

        setTypeStats(
          Array.from(typeMap.entries()).map(([type, data]) => ({
            push_type: type,
            sent: data.sent,
            clicked: data.clicked,
            ctr:
              data.sent > 0
                ? Math.round((data.clicked / data.sent) * 100 * 10) / 10
                : 0,
          }))
        );
      }

      const { data: recent } = await supabase
        .from("push_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(10);

      if (recent) {
        setRecentLogs(recent);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Push Notification Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              오늘 발송
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.todaySent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.ctr}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              활성 유저
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              미클릭 3+
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats.fatigueUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">타입별 발송 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {typeStats.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                오늘 발송된 알림이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {typeStats.map((stat) => (
                  <div key={stat.push_type} className="flex items-center gap-4">
                    <div className="w-24 font-medium text-foreground">{stat.push_type}</div>
                    <div className="flex-1 bg-muted rounded-full h-4">
                      <div
                        className="bg-blue-500 rounded-full h-4"
                        style={{
                          width: `${Math.min((stat.sent / Math.max(...typeStats.map((s) => s.sent))) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-32 text-sm text-muted-foreground">
                      {stat.sent} (CTR {stat.ctr}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">최근 발송 로그</CardTitle>
            <a
              href="/admin/push-logs"
              className="text-sm text-primary hover:underline"
            >
              더보기 →
            </a>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                발송 로그가 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.sent_at).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge variant="outline">{log.push_type}</Badge>
                    </div>
                    <div>
                      {log.is_clicked ? (
                        <span className="text-green-600 dark:text-green-400">✅ clicked</span>
                      ) : (
                        <span className="text-muted-foreground">⏳ pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
