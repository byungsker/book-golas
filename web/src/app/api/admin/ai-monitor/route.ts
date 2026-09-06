import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import {
  AiMonitorQueryError,
  loadAiMonitorReport,
  parseAiMonitorFilters,
} from "@/lib/ai-monitor";
import { isAiMonitorDemoRequest } from "@/lib/ai-monitor-access";
import { captureWebError } from "@/lib/error-reporting";
import { requireAdminUser } from "@/lib/supabase-server";

function serverError(request: NextRequest) {
  const requestId = captureWebError(request, {
    route: "/api/admin/ai-monitor",
    errorCode: "ai_monitor_route_failed",
    status: 500,
  });
  return NextResponse.json(
    { error: "AI monitor data is unavailable", code: "monitor_unavailable" },
    { status: 500, headers: { "Cache-Control": "no-store", "x-request-id": requestId } },
  );
}

export async function GET(request: NextRequest) {
  if (!(await requireAdminUser())) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let filters;
  try {
    filters = parseAiMonitorFilters(request.nextUrl.searchParams);
  } catch (error) {
    if (error instanceof AiMonitorQueryError) {
      return NextResponse.json(
        { error: "Invalid monitor filters", code: "invalid_filters", field: error.field },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }

  if (!isAiMonitorDemoRequest(request.headers.get("host"))) {
    return serverError(request);
  }

  try {
    return NextResponse.json(await loadAiMonitorReport(filters), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return serverError(request);
  }
}
