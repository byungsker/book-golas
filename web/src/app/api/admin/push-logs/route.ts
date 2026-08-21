import { NextRequest, NextResponse } from "next/server";
import { captureWebError } from "@/lib/error-reporting";
import { aggregatePushOps, getPushOpsDateRange, type PushLogMetricRow } from "@/lib/push-ops";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

const PAGE_SIZE = 20;
const SUMMARY_MAX_ROWS = 10000;
const SUMMARY_COLUMNS = "push_type, created_at, sent_at, is_clicked, delivery_status, failure_code, invalid_token, dedupe_status";

function serverError(request: NextRequest, errorCode: string, message: string) {
  const requestId = captureWebError(request, {
    route: "/api/admin/push-logs",
    errorCode,
    status: 500,
  });
  return NextResponse.json(
    { error: message },
    { status: 500, headers: { "x-request-id": requestId } },
  );
}

export async function GET(request: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.nextUrl.searchParams.get("summary") === "1") {
    const pushType = request.nextUrl.searchParams.get("type") ?? "all";
    if (pushType !== "all" && (!/^[A-Za-z0-9_-]+$/.test(pushType) || pushType.length > 80)) {
      return NextResponse.json({ error: "Invalid push type" }, { status: 400 });
    }

    try {
      const dateRange = getPushOpsDateRange();
      let query = createServiceRoleSupabaseClient()
        .from("push_logs")
        .select(SUMMARY_COLUMNS)
        .gte("created_at", dateRange.fromTimestamp)
        .lt("created_at", dateRange.toExclusiveTimestamp)
        .order("created_at", { ascending: false })
        .limit(SUMMARY_MAX_ROWS);
      if (pushType !== "all") query = query.eq("push_type", pushType);

      const { data, error } = await query;
      if (error) return serverError(request, "push_summary_query_failed", "Failed to load push summary");

      return NextResponse.json({
        range: { from: dateRange.from, to: dateRange.to },
        pushType,
        summary: aggregatePushOps((data ?? []) as PushLogMetricRow[]),
        limits: { maxRows: SUMMARY_MAX_ROWS, truncated: (data?.length ?? 0) === SUMMARY_MAX_ROWS },
      }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return serverError(request, "push_summary_route_failed", "Server configuration error");
    }
  }
  if (request.nextUrl.searchParams.get("dashboard") === "1") {
    const today = new Date().toISOString().split("T")[0];
    const client = createServiceRoleSupabaseClient();
    const [todayResult, recentResult] = await Promise.all([
      client.from("push_logs").select("*").gte("sent_at", today),
      client.from("push_logs").select("*").order("sent_at", { ascending: false }).limit(10),
    ]);
    if (todayResult.error || recentResult.error) return serverError(request, "push_dashboard_query_failed", "Failed to load dashboard logs");
    return NextResponse.json({ todayLogs: todayResult.data ?? [], recentLogs: recentResult.data ?? [] });
  }
  const page = Math.max(0, Number(request.nextUrl.searchParams.get("page") ?? "0") || 0);
  const type = request.nextUrl.searchParams.get("type") ?? "all";
  let query = createServiceRoleSupabaseClient()
    .from("push_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (type !== "all") query = query.eq("push_type", type);
  const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) return serverError(request, "push_logs_query_failed", "Failed to load logs");
  return NextResponse.json({ logs: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE });
}
