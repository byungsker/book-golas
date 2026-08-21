import { NextRequest, NextResponse } from "next/server";
import { aggregateAiUsage, parseAiUsageDateRange, type AiUsageLogRow } from "@/lib/ai-usage";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

const MAX_ROWS = 10000;
const FUNCTION_NAME_PATTERN = /^[A-Za-z0-9._:/-]+$/;
const AI_USAGE_COLUMNS = "function_name, latency_ms, status, estimated_cost_usd, created_at";

export async function GET(request: NextRequest) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let dateRange;
  try {
    dateRange = parseAiUsageDateRange(request.nextUrl.searchParams);
  } catch {
    return NextResponse.json(
      { error: "Invalid date range", code: "invalid_date_range" },
      { status: 400 }
    );
  }

  const functionFilter = request.nextUrl.searchParams.get("function")?.trim() || "all";
  if (functionFilter !== "all" && (!FUNCTION_NAME_PATTERN.test(functionFilter) || functionFilter.length > 100)) {
    return NextResponse.json(
      { error: "Invalid function filter", code: "invalid_function_filter" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await createServiceRoleSupabaseClient()
      .from("ai_usage_logs")
      .select(AI_USAGE_COLUMNS)
      .gte("created_at", dateRange.fromTimestamp)
      .lt("created_at", dateRange.toExclusiveTimestamp)
      .order("created_at", { ascending: true })
      .limit(MAX_ROWS);

    if (error) {
      return NextResponse.json({ error: "Failed to load AI usage summary" }, { status: 500 });
    }

    const rows = (data ?? []) as AiUsageLogRow[];
    const functionNames = Array.from(
      new Set(rows.map((row) => row.function_name?.trim()).filter(Boolean))
    ).sort();
    const filteredRows = functionFilter === "all"
      ? rows
      : rows.filter((row) => row.function_name === functionFilter);

    return NextResponse.json(
      {
        range: { from: dateRange.from, to: dateRange.to },
        functionFilter,
        functionNames,
        ...aggregateAiUsage(filteredRows),
        limits: { maxRows: MAX_ROWS, truncated: rows.length === MAX_ROWS },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}
