import "server-only";

import { cookies } from "next/headers";
import { getConsumerRouteFixture } from "@/shared/config";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getChartsGoalsFixture } from "../model/charts-goals-fixtures";
import {
  ReadingAnalyticsBookSchema,
  ReadingAnalyticsRequestSchema,
  ReadingAnalyticsSourceGoalSchema,
  ReadingAnalyticsSourceProgressSchema,
  ReadingAnalyticsSourceSessionSchema,
  type ReadingAnalyticsData,
  type ReadingAnalyticsRequest,
} from "./reading-analytics-contracts";
import { buildReadingAnalytics, getReadingAnalyticsSourceBounds } from "../model/reading-analytics";

type ReadingAnalyticsQueryCode =
  | "ok"
  | "unauthenticated"
  | "unavailable"
  | "not_found";

export type ReadingAnalyticsQueryResult = {
  data: ReadingAnalyticsData | null;
  code: ReadingAnalyticsQueryCode;
  authenticated: boolean;
  errorCode?: string;
};

function readingAnalyticsFailure(code: string, authenticated: boolean): ReadingAnalyticsQueryResult {
  return {
    data: null,
    code: code === "unauthorized" ? "unauthenticated" : "unavailable",
    authenticated,
    errorCode: code,
  };
}

export async function fetchOwnedReadingAnalyticsData(
  input: ReadingAnalyticsRequest,
): Promise<ReadingAnalyticsQueryResult> {
  const context = await getConsumerAuthContext();
  const parsedRequest = ReadingAnalyticsRequestSchema.safeParse(input);
  if (!parsedRequest.success) return readingAnalyticsFailure("validation_error", Boolean(context.user));

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("charts-goals-")) {
    const fixture = getChartsGoalsFixture({ fixture: routeFixture, request: parsedRequest.data });
    return fixture.ok
      ? { data: fixture.value, code: "ok", authenticated: true }
      : readingAnalyticsFailure(fixture.error.code, true);
  }

  if (context.unavailable || !context.supabase) {
    return readingAnalyticsFailure("unavailable", Boolean(context.user));
  }
  if (!context.user) return readingAnalyticsFailure("unauthorized", false);

  let bounds: { start: Date; end: Date };
  try {
    bounds = getReadingAnalyticsSourceBounds(parsedRequest.data);
  } catch {
    return readingAnalyticsFailure("validation_error", true);
  }

  try {
    const [booksResult, progressResult, sessionResult, goalResult] = await Promise.all([
      context.supabase
        .from("books")
        .select("id,title,status,genre,attempt_count,created_at,updated_at,deleted_at")
        .eq("user_id", context.user.id)
        .is("deleted_at", null),
      context.supabase
        .from("reading_progress_history")
        .select("id,book_id,page,previous_page,reading_time,created_at")
        .eq("user_id", context.user.id)
        .gte("created_at", bounds.start.toISOString())
        .lt("created_at", bounds.end.toISOString())
        .order("created_at", { ascending: true }),
      context.supabase
        .from("reading_sessions")
        .select("id,book_id,started_at,ended_at,duration_seconds,created_at")
        .eq("user_id", context.user.id)
        .gte("started_at", bounds.start.toISOString())
        .lt("started_at", bounds.end.toISOString())
        .order("started_at", { ascending: true }),
      context.supabase
        .from("reading_goals")
        .select("year,target_books")
        .eq("user_id", context.user.id)
        .eq("year", parsedRequest.data.year)
        .maybeSingle(),
    ]);

    if (booksResult.error || progressResult.error || sessionResult.error || goalResult.error) {
      return readingAnalyticsFailure("unavailable", true);
    }
    if (!Array.isArray(booksResult.data) || !Array.isArray(progressResult.data) || !Array.isArray(sessionResult.data)) {
      return readingAnalyticsFailure("unavailable", true);
    }

    const books = [];
    for (const row of booksResult.data) {
      if (!row || typeof row !== "object") return readingAnalyticsFailure("unavailable", true);
      const value = row as Record<string, unknown>;
      const parsedBook = ReadingAnalyticsBookSchema.safeParse({
        bookId: value.id,
        title: value.title,
        status: ["planned", "reading", "completed", "will_retry"].includes(String(value.status)) ? value.status : "unknown",
        genre: typeof value.genre === "string" && value.genre.trim() ? value.genre : null,
        attemptCount: typeof value.attempt_count === "number" ? value.attempt_count : 1,
        createdAt: typeof value.created_at === "string" ? value.created_at : null,
        updatedAt: typeof value.updated_at === "string" ? value.updated_at : null,
      });
      if (!parsedBook.success) return readingAnalyticsFailure("unavailable", true);
      books.push(parsedBook.data);
    }

    const progress = [];
    for (const row of progressResult.data) {
      if (!row || typeof row !== "object") return readingAnalyticsFailure("unavailable", true);
      const value = row as Record<string, unknown>;
      const parsedProgress = ReadingAnalyticsSourceProgressSchema.safeParse({
        id: value.id,
        bookId: value.book_id,
        page: value.page,
        previousPage: value.previous_page ?? 0,
        readingTime: typeof value.reading_time === "number" ? value.reading_time : null,
        occurredAt: value.created_at,
      });
      if (!parsedProgress.success) return readingAnalyticsFailure("unavailable", true);
      progress.push(parsedProgress.data);
    }

    const sessions = [];
    for (const row of sessionResult.data) {
      if (!row || typeof row !== "object") return readingAnalyticsFailure("unavailable", true);
      const value = row as Record<string, unknown>;
      const parsedSession = ReadingAnalyticsSourceSessionSchema.safeParse({
        id: value.id,
        bookId: value.book_id,
        startedAt: value.started_at,
        endedAt: typeof value.ended_at === "string" ? value.ended_at : null,
        durationSeconds: value.duration_seconds,
        createdAt: typeof value.created_at === "string" ? value.created_at : null,
      });
      if (!parsedSession.success) return readingAnalyticsFailure("unavailable", true);
      sessions.push(parsedSession.data);
    }

    const goal = goalResult.data && typeof goalResult.data === "object"
      ? ReadingAnalyticsSourceGoalSchema.safeParse({
          year: (goalResult.data as Record<string, unknown>).year,
          targetBooks: (goalResult.data as Record<string, unknown>).target_books,
        })
      : null;
    if (goal && !goal.success) return readingAnalyticsFailure("unavailable", true);

    const data = buildReadingAnalytics({
      request: parsedRequest.data,
      books,
      progress,
      sessions,
      goal: goal?.success ? goal.data : null,
    });
    return { data, code: "ok", authenticated: true };
  } catch {
    return readingAnalyticsFailure("unavailable", true);
  }
}
