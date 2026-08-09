import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.nextUrl.searchParams.get("dashboard") === "1") {
    const today = new Date().toISOString().split("T")[0];
    const client = createServiceRoleSupabaseClient();
    const [todayResult, recentResult] = await Promise.all([
      client.from("push_logs").select("*").gte("sent_at", today),
      client.from("push_logs").select("*").order("sent_at", { ascending: false }).limit(10),
    ]);
    if (todayResult.error || recentResult.error) return NextResponse.json({ error: "Failed to load dashboard logs" }, { status: 500 });
    return NextResponse.json({ todayLogs: todayResult.data ?? [], recentLogs: recentResult.data ?? [] });
  }
  const page = Math.max(0, Number(request.nextUrl.searchParams.get("page") ?? "0") || 0);
  const type = request.nextUrl.searchParams.get("type") ?? "all";
  let query = createServiceRoleSupabaseClient()
    .from("push_logs")
    .select("*")
    .order("sent_at", { ascending: false });
  if (type !== "all") query = query.eq("push_type", type);
  const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  return NextResponse.json({ logs: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE });
}
