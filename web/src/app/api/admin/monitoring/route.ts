import { NextResponse } from "next/server";

import { normalizeGrowthMetrics } from "@/lib/admin/monitoring";
import {
  createServiceRoleSupabaseClient,
  requireAdminUser,
} from "@/lib/supabase-server";
import type { AdminMonitoringMetrics } from "@/types/monitoring";

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = createServiceRoleSupabaseClient();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [rpcResult, sentPushResult, clickedPushResult] = await Promise.all([
      supabaseAdmin.rpc("get_control_plane_growth_metrics"),
      supabaseAdmin
        .from("push_logs")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", cutoff),
      supabaseAdmin
        .from("push_logs")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", cutoff)
        .eq("is_clicked", true),
    ]);

    const rpcMetrics = rpcResult.error
      ? null
      : normalizeGrowthMetrics(rpcResult.data);
    let totalUsersResult: CountResult | null = null;
    let newUsersResult: CountResult | null = null;
    let totalBooksResult: CountResult | null = null;
    let newBooksResult: CountResult | null = null;
    let totalReadingResult: CountResult | null = null;
    let newReadingResult: CountResult | null = null;
    let totalRecallResult: CountResult | null = null;
    let newRecallResult: CountResult | null = null;

    if (!rpcMetrics) {
      [
        totalUsersResult,
        newUsersResult,
        totalBooksResult,
        newBooksResult,
        totalReadingResult,
        newReadingResult,
        totalRecallResult,
        newRecallResult,
      ] = await Promise.all([
        supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", cutoff),
        supabaseAdmin.from("books").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("books")
          .select("id", { count: "exact", head: true })
          .gte("created_at", cutoff),
        supabaseAdmin
          .from("reading_progress_history")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("reading_progress_history")
          .select("id", { count: "exact", head: true })
          .gte("created_at", cutoff),
        supabaseAdmin
          .from("recall_search_history")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("recall_search_history")
          .select("id", { count: "exact", head: true })
          .gte("created_at", cutoff),
      ]);
    }

    const unavailableMetrics: string[] = [];

    function countOrNull(result: CountResult | null, metricName: string) {
      if (!result || result.error) {
        unavailableMetrics.push(metricName);
        return null;
      }

      return result.count ?? 0;
    }

    if (!rpcMetrics) {
      unavailableMetrics.push(
        "active_users_7d",
        "users_with_books",
        "users_with_reading_records",
        "users_with_ai_recall",
      );
    }

    const metrics: AdminMonitoringMetrics = {
      generated_at: new Date().toISOString(),
      period_days: 7,
      source_status: "connected",
      unavailable_metrics: unavailableMetrics,
      users: {
        total:
          rpcMetrics?.total_users ??
          countOrNull(totalUsersResult, "total_users"),
        new_7d:
          rpcMetrics?.new_users_7d ??
          countOrNull(newUsersResult, "new_users_7d"),
        active_7d: rpcMetrics?.active_users_7d ?? null,
      },
      books: {
        total:
          rpcMetrics?.total_books ??
          countOrNull(totalBooksResult, "total_books"),
        created_7d:
          rpcMetrics?.books_created_7d ??
          countOrNull(newBooksResult, "books_created_7d"),
        users_with_books: rpcMetrics?.users_with_books ?? null,
      },
      reading: {
        total_records:
          rpcMetrics?.total_reading_records ??
          countOrNull(totalReadingResult, "total_reading_records"),
        records_7d:
          rpcMetrics?.reading_records_7d ??
          countOrNull(newReadingResult, "reading_records_7d"),
        users_with_records: rpcMetrics?.users_with_reading_records ?? null,
      },
      recall: {
        total:
          rpcMetrics?.total_ai_recalls ??
          countOrNull(totalRecallResult, "total_ai_recalls"),
        created_7d:
          rpcMetrics?.ai_recalls_7d ??
          countOrNull(newRecallResult, "ai_recalls_7d"),
        users_with_recall: rpcMetrics?.users_with_ai_recall ?? null,
      },
      push: {
        sent_7d: countOrNull(sentPushResult, "push_sent_7d"),
        clicked_7d: countOrNull(clickedPushResult, "push_clicked_7d"),
      },
    };

    metrics.source_status =
      metrics.unavailable_metrics.length > 0 ? "partial" : "connected";

    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
}
