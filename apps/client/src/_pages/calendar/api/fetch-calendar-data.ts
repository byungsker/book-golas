import "server-only";

import { cookies } from "next/headers";
import { getConsumerRouteFixture } from "@/shared/config";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getCalendarFixture } from "../model/calendar-fixtures";
import {
  CalendarBookSchema,
  CalendarSourceProgressSchema,
  CalendarSourceSessionSchema,
} from "@/shared/api/contracts";
import { CalendarFilterSchema, type CalendarData, type CalendarFilter } from "./calendar-contracts";
import { buildCalendarData, getCalendarMonthBounds } from "../model/calendar-data";

type CalendarQueryCode =
  | "ok"
  | "unauthenticated"
  | "unavailable"
  | "not_found";

export type CalendarQueryResult = {
  data: CalendarData | null;
  code: CalendarQueryCode;
  authenticated: boolean;
  errorCode?: string;
};

function calendarFailure(
  code: string,
  authenticated: boolean,
): CalendarQueryResult {
  return {
    data: null,
    code: code === "unauthorized" ? "unauthenticated" : "unavailable",
    authenticated,
    errorCode: code,
  };
}

export async function fetchOwnedCalendarData(input: {
  year: number;
  month: number;
  filter: CalendarFilter;
}): Promise<CalendarQueryResult> {
  const context = await getConsumerAuthContext();
  const parsedFilter = CalendarFilterSchema.safeParse(input.filter);
  if (!parsedFilter.success) return calendarFailure("validation_error", Boolean(context.user));

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("calendar-")) {
    const fixture = getCalendarFixture({
      fixture: routeFixture,
      year: input.year,
      month: input.month,
      filter: parsedFilter.data,
    });
    return fixture.ok
      ? { data: fixture.value, code: "ok", authenticated: true }
      : calendarFailure(fixture.error.code, true);
  }

  if (context.unavailable || !context.supabase) {
    return calendarFailure("unavailable", Boolean(context.user));
  }
  if (!context.user) return calendarFailure("unauthorized", false);

  let bounds: { start: Date; end: Date };
  try {
    bounds = getCalendarMonthBounds(input.year, input.month);
  } catch {
    return calendarFailure("validation_error", true);
  }

  try {
    const { data: bookRows, error: booksError } = await context.supabase
      .from("books")
      .select("id,title,author,image_url,status,start_date,target_date,planned_start_date,paused_at,deleted_at")
      .eq("user_id", context.user.id)
      .is("deleted_at", null);
    if (booksError || !Array.isArray(bookRows)) return calendarFailure("unavailable", true);

    const books = [];
    for (const row of bookRows) {
      if (!row || typeof row !== "object") return calendarFailure("unavailable", true);
      const value = row as Record<string, unknown>;
      const parsedBook = CalendarBookSchema.safeParse({
        bookId: value.id,
        title: value.title,
        author: typeof value.author === "string" && value.author.trim() ? value.author : null,
        imageUrl: typeof value.image_url === "string" && value.image_url.trim() ? value.image_url : null,
        status: ["planned", "reading", "completed", "will_retry"].includes(String(value.status))
          ? value.status
          : "unknown",
        startDate: value.start_date,
        targetDate: value.target_date,
        plannedStartDate: typeof value.planned_start_date === "string" ? value.planned_start_date : null,
        pausedAt: typeof value.paused_at === "string" ? value.paused_at : null,
      });
      if (!parsedBook.success) return calendarFailure("unavailable", true);
      books.push(parsedBook.data);
    }

    const [progressResult, sessionResult] = await Promise.all([
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
    ]);
    if (progressResult.error || sessionResult.error) return calendarFailure("unavailable", true);
    if (!Array.isArray(progressResult.data) || !Array.isArray(sessionResult.data)) {
      return calendarFailure("unavailable", true);
    }

    const progress = [];
    for (const row of progressResult.data) {
      if (!row || typeof row !== "object") return calendarFailure("unavailable", true);
      const value = row as Record<string, unknown>;
      const parsed = CalendarSourceProgressSchema.safeParse({
        id: value.id,
        bookId: value.book_id,
        page: value.page,
        previousPage: value.previous_page ?? 0,
        readingTime: typeof value.reading_time === "number" ? value.reading_time : null,
        occurredAt: value.created_at,
      });
      if (!parsed.success) return calendarFailure("unavailable", true);
      progress.push(parsed.data);
    }

    const sessions = [];
    for (const row of sessionResult.data) {
      if (!row || typeof row !== "object") return calendarFailure("unavailable", true);
      const value = row as Record<string, unknown>;
      const parsed = CalendarSourceSessionSchema.safeParse({
        id: value.id,
        bookId: value.book_id,
        startedAt: value.started_at,
        endedAt: typeof value.ended_at === "string" ? value.ended_at : null,
        durationSeconds: value.duration_seconds,
        createdAt: typeof value.created_at === "string" ? value.created_at : null,
      });
      if (!parsed.success) return calendarFailure("unavailable", true);
      sessions.push(parsed.data);
    }

    const data = buildCalendarData({
      year: input.year,
      month: input.month,
      filter: parsedFilter.data,
      books,
      progress,
      sessions,
    });
    return { data, code: "ok", authenticated: true };
  } catch {
    return calendarFailure("unavailable", true);
  }
}
