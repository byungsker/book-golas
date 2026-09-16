import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  consumerBookSelect,
  isBookId,
  parseConsumerBook,
  type ConsumerBook,
} from "@/lib/consumer/types";
import { getHomeBookListFixtureBooks } from "@/lib/consumer/home-book-list-fixtures";
import { getBookLifecycleFixtureConsumerBook } from "@/lib/consumer/book-lifecycle-fixtures";
import { getBookDetailFixture, getBookDetailFixtureConsumerBook } from "@/lib/consumer/book-detail-fixtures";
import { getReviewShareFixtureBook } from "@/lib/consumer/review-share-fixtures";
import { getProgressFixtureSnapshot } from "@/lib/consumer/progress-fixtures";
import { getTimerFixtureBook } from "@/lib/consumer/timer-fixtures";
import { getCalendarFixture } from "@/lib/consumer/calendar-fixtures";
import { getChartsGoalsFixture } from "@/lib/consumer/charts-goals-fixtures";
import {
  bookDtoSelect,
  parseBookRow,
} from "@/lib/product/dal/codec";
import {
  buildCalendarData,
  CalendarBookSchema,
  CalendarFilterSchema,
  CalendarSourceProgressSchema,
  CalendarSourceSessionSchema,
  getCalendarMonthBounds,
  buildReadingAnalytics,
  ReadingAnalyticsBookSchema,
  ReadingAnalyticsRequestSchema,
  ReadingAnalyticsSourceGoalSchema,
  ReadingAnalyticsSourceProgressSchema,
  ReadingAnalyticsSourceSessionSchema,
  getReadingAnalyticsSourceBounds,
  type ReadingAnalyticsData,
  type ReadingAnalyticsRequest,
  ProgressEventSchema,
  type Book,
  type CalendarData,
  type CalendarFilter,
  type ProgressEvent,
} from "@/lib/product/contracts";

type AuthContext = {
  supabase: SupabaseClient | null;
  user: User | null;
  unavailable: boolean;
};

export type ConsumerQueryCode =
  | "ok"
  | "unauthenticated"
  | "unavailable"
  | "not_found";

async function getAuthContext(): Promise<AuthContext> {
  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture === "anonymous" || routeFixture === "expired-session") {
    return { supabase: null, user: null, unavailable: false };
  }
  if (routeFixture === "unavailable") {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: true,
    };
  }
  if (routeFixture === "bootstrap-network") {
    return { supabase: null, user: null, unavailable: true };
  }
  if ([
    "authenticated-not-found",
    "deleted-book",
    "home-book-list",
    "home-empty-completed",
    "home-empty-paused",
    "home-empty-planned",
    "home-empty-reading",
    "unauthorized-private-data",
    "pending",
  ].includes(routeFixture ?? "")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("library-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-discovery-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-lifecycle-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-detail-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("progress-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("calendar-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("charts-goals-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("ai-consent-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("recall-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("timer-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("notes-highlights-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("images-ocr-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("review-share-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return {
      supabase,
      user: error ? null : user,
      unavailable: Boolean(error),
    };
  } catch {
    return { supabase: null, user: null, unavailable: true };
  }
}

export async function getCurrentConsumerUser(): Promise<{
  user: User | null;
  unavailable: boolean;
}> {
  const context = await getAuthContext();
  return { user: context.user, unavailable: context.unavailable };
}

export async function fetchOwnedBooks(): Promise<{
  books: ConsumerBook[];
  code: ConsumerQueryCode;
}> {
  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture === "pending") {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }
  const context = await getAuthContext();
  if (context.unavailable) {
    return { books: [], code: "unavailable" };
  }
  if (context.user && !context.supabase) {
    if (routeFixture === "home-book-list") {
      return { books: getHomeBookListFixtureBooks(), code: "ok" };
    }
    if (routeFixture?.startsWith("book-lifecycle-")) {
      return { books: [getBookLifecycleFixtureConsumerBook()], code: "ok" };
    }
    if (routeFixture?.startsWith("book-detail-")) {
      const book = getBookDetailFixtureConsumerBook({ fixture: routeFixture, bookId: "" });
      return { books: book ? [book] : [], code: "ok" };
    }
    return { books: [], code: "ok" };
  }
  if (!context.supabase) {
    return { books: [], code: "unavailable" };
  }
  if (!context.user) return { books: [], code: "unauthenticated" };

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) return { books: [], code: "unavailable" };

    const books = (Array.isArray(data) ? data : []).flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const rowValue = row as Record<string, unknown>;
      if (rowValue.deleted_at !== null && rowValue.deleted_at !== undefined) return [];
      const book = parseConsumerBook(rowValue);
      return book ? [book] : [];
    });

    return { books, code: "ok" };
  } catch {
    return { books: [], code: "unavailable" };
  }
}

export async function fetchOwnedBook(bookId: string): Promise<{
  book: ConsumerBook | null;
  code: ConsumerQueryCode;
  authenticated: boolean;
}> {
  const context = await getAuthContext();
  if (!isBookId(bookId)) {
    return {
      book: null,
      code: context.unavailable ? "unavailable" : "not_found",
      authenticated: Boolean(context.user),
    };
  }

  if (context.unavailable || !context.supabase) {
    if (context.user) {
      return { book: null, code: "not_found", authenticated: true };
    }
    return { book: null, code: "unavailable", authenticated: false };
  }
  if (!context.user) {
    return { book: null, code: "unauthenticated", authenticated: false };
  }

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { book: null, code: "unavailable", authenticated: true };
    if (!data || typeof data !== "object") {
      return { book: null, code: "not_found", authenticated: true };
    }

    const book = parseConsumerBook(data as Record<string, unknown>);
    return book
      ? { book, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  } catch {
    return { book: null, code: "unavailable", authenticated: true };
  }
}

export async function fetchOwnedBookDetail(bookId: string): Promise<{
  book: Book | null;
  code: ConsumerQueryCode;
  authenticated: boolean;
}> {
  const context = await getAuthContext();
  if (!isBookId(bookId)) {
    return {
      book: null,
      code: context.unavailable ? "unavailable" : "not_found",
      authenticated: Boolean(context.user),
    };
  }

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("book-detail-")) {
    const result = getBookDetailFixture({ fixture: routeFixture, bookId });
    if (!result.ok) {
      return {
        book: null,
        code: result.error.code === "not_found" ? "not_found" : "unavailable",
        authenticated: true,
      };
    }
    return { book: result.value, code: "ok", authenticated: true };
  }
  if (routeFixture?.startsWith("recall-")) {
    const result = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
    return result.ok
      ? { book: result.value, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("progress-")) {
    const snapshot = getProgressFixtureSnapshot({ fixture: routeFixture, bookId });
    return snapshot
      ? { book: snapshot.book, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("timer-")) {
    const timerBook = getTimerFixtureBook(routeFixture, bookId);
    return timerBook.ok
      ? { book: timerBook.value, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("notes-highlights-")) {
    const detail = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
    return detail.ok
      ? { book: detail.value, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("images-ocr-")) {
    const detail = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
    return detail.ok
      ? { book: detail.value, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("review-share-")) {
    const detail = getReviewShareFixtureBook(routeFixture, bookId);
    return detail.ok
      ? { book: detail.value, code: "ok", authenticated: true }
      : {
          book: null,
          code: detail.error.code === "not_found" ? "not_found" : detail.error.code === "unauthorized" ? "unauthenticated" : "unavailable",
          authenticated: true,
        };
  }

  if (context.unavailable || !context.supabase) {
    if (context.user) return { book: null, code: "not_found", authenticated: true };
    return { book: null, code: "unavailable", authenticated: false };
  }
  if (!context.user) return { book: null, code: "unauthenticated", authenticated: false };

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(bookDtoSelect)
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return { book: null, code: "unavailable", authenticated: true };
    if (!data || typeof data !== "object") return { book: null, code: "not_found", authenticated: true };
    const result = parseBookRow(data);
    return result.ok
      ? { book: result.value, code: "ok", authenticated: true }
      : { book: null, code: "unavailable", authenticated: true };
  } catch {
    return { book: null, code: "unavailable", authenticated: true };
  }
}

export async function fetchOwnedProgressHistory(bookId: string): Promise<{
  history: ProgressEvent[];
  code: ConsumerQueryCode;
  authenticated: boolean;
}> {
  const context = await getAuthContext();
  if (!isBookId(bookId)) {
    return {
      history: [],
      code: context.unavailable ? "unavailable" : "not_found",
      authenticated: Boolean(context.user),
    };
  }

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("progress-")) {
    const snapshot = getProgressFixtureSnapshot({ fixture: routeFixture, bookId });
    return snapshot
      ? { history: snapshot.history, code: "ok", authenticated: true }
      : { history: [], code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("timer-")) {
    const timerBook = getTimerFixtureBook(routeFixture, bookId);
    return timerBook.ok
      ? { history: [], code: "ok", authenticated: true }
      : { history: [], code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("notes-highlights-")) {
    const detail = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
    return detail.ok
      ? { history: [], code: "ok", authenticated: true }
      : { history: [], code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("images-ocr-")) {
    const detail = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
    return detail.ok
      ? { history: [], code: "ok", authenticated: true }
      : { history: [], code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("review-share-")) {
    const detail = getReviewShareFixtureBook(routeFixture, bookId);
    return detail.ok
      ? { history: [], code: "ok", authenticated: true }
      : { history: [], code: "not_found", authenticated: true };
  }

  if (context.unavailable || !context.supabase) {
    return context.user
      ? { history: [], code: "unavailable", authenticated: true }
      : { history: [], code: "unavailable", authenticated: false };
  }
  if (!context.user) {
    return { history: [], code: "unauthenticated", authenticated: false };
  }

  try {
    const ownedBook = await context.supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (ownedBook.error) return { history: [], code: "unavailable", authenticated: true };
    if (!ownedBook.data) return { history: [], code: "not_found", authenticated: true };

    const { data, error } = await context.supabase
      .from("reading_progress_history")
      .select("id,book_id,page,previous_page,reading_time,created_at")
      .eq("book_id", bookId)
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: true });
    if (error || !Array.isArray(data)) {
      return { history: [], code: "unavailable", authenticated: true };
    }

    const history: ProgressEvent[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") {
        return { history: [], code: "unavailable", authenticated: true };
      }
      const value = row as Record<string, unknown>;
      const parsed = ProgressEventSchema.safeParse({
        id: value.id,
        bookId: value.book_id,
        page: value.page,
        previousPage: value.previous_page ?? 0,
        ...(typeof value.reading_time === "number" ? { readingTime: value.reading_time } : {}),
        createdAt: value.created_at,
      });
      if (!parsed.success) return { history: [], code: "unavailable", authenticated: true };
      history.push(parsed.data);
    }
    return { history, code: "ok", authenticated: true };
  } catch {
    return { history: [], code: "unavailable", authenticated: true };
  }
}

export type CalendarQueryResult = {
  data: CalendarData | null;
  code: ConsumerQueryCode;
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
  const context = await getAuthContext();
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

export type ReadingAnalyticsQueryResult = {
  data: ReadingAnalyticsData | null;
  code: ConsumerQueryCode;
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
  const context = await getAuthContext();
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
