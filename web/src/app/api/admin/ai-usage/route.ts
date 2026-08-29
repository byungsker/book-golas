import { NextRequest, NextResponse } from "next/server";
import {
  aggregateAiUsage,
  aggregateAiUsageByFeatureModel,
  aggregateAiUsageControls,
  parseAiUsageDateRange,
  type AiUsageControlEventRow,
  type AiUsageLogRow,
  toAiUsagePolicy,
  type AiUsagePolicyRow,
} from "@/lib/ai-usage";
import { captureWebError } from "@/lib/error-reporting";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

const MAX_ROWS = 10000;
const FUNCTION_NAME_PATTERN = /^[A-Za-z0-9._:/-]+$/;
const AI_USAGE_COLUMNS = "function_name, feature, provider, model, latency_ms, status, estimated_cost_usd, pricing_status, token_status, usage_source, created_at";
const AI_CONTROL_COLUMNS = "function_name, event_type, decision, reason, created_at";
const AI_USAGE_POLICY_COLUMNS = "policy_version, effective_from, requests_per_minute, requests_per_day, concurrent_requests, budget_usd_per_day, hard_cap_usd_per_day, warning_ratio, critical_ratio";

function serverError(request: NextRequest, errorCode: string, message: string) {
  const requestId = captureWebError(request, {
    route: "/api/admin/ai-usage",
    errorCode,
    status: 500,
  });
  return NextResponse.json(
    { error: message },
    { status: 500, headers: { "x-request-id": requestId } },
  );
}

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
    const client = createServiceRoleSupabaseClient();
    const [usageResult, controlResult, policyResult] = await Promise.all([
      client
        .from("ai_usage_logs")
        .select(AI_USAGE_COLUMNS)
        .gte("created_at", dateRange.fromTimestamp)
        .lt("created_at", dateRange.toExclusiveTimestamp)
        .order("created_at", { ascending: true })
        .limit(MAX_ROWS),
      client
        .from("ai_usage_control_events")
        .select(AI_CONTROL_COLUMNS)
        .gte("created_at", dateRange.fromTimestamp)
        .lt("created_at", dateRange.toExclusiveTimestamp)
        .order("created_at", { ascending: true })
        .limit(MAX_ROWS),
      client
        .from("ai_usage_policy_versions")
        .select(AI_USAGE_POLICY_COLUMNS)
        .eq("policy_key", "default")
        .lte("effective_from", new Date().toISOString())
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (usageResult.error || controlResult.error || policyResult.error || !policyResult.data) {
      return serverError(request, "ai_usage_query_failed", "Failed to load AI usage summary");
    }

    const rows = (usageResult.data ?? []) as AiUsageLogRow[];
    const controlRows = (controlResult.data ?? []) as AiUsageControlEventRow[];
    const policy = toAiUsagePolicy(policyResult.data as AiUsagePolicyRow);
    const functionNames = Array.from(
      new Set([
        ...rows.map((row) => row.function_name?.trim()),
        ...controlRows.map((row) => row.function_name?.trim()),
      ].filter(Boolean))
    ).sort();
    const filteredRows = functionFilter === "all"
      ? rows
      : rows.filter((row) => row.function_name === functionFilter);
    const filteredControlRows = functionFilter === "all"
      ? controlRows
      : controlRows.filter((row) => row.function_name === functionFilter);

    return NextResponse.json(
      {
        range: { from: dateRange.from, to: dateRange.to },
        functionFilter,
        functionNames,
        ...aggregateAiUsage(filteredRows),
        featureModels: aggregateAiUsageByFeatureModel(filteredRows),
        controls: aggregateAiUsageControls(filteredControlRows),
        policy,
        limits: {
          maxRows: MAX_ROWS,
          truncated: rows.length === MAX_ROWS || controlRows.length === MAX_ROWS,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return serverError(request, "ai_usage_route_failed", "Server configuration error");
  }
}
