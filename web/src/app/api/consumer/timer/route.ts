import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { applyTimerFixture } from "@/lib/consumer/timer-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  BookSchema,
  ReadingSessionSchema,
  TimerFinishRequestSchema,
  type Book,
  type ReadingSession,
  type TimerFinishSuccess,
} from "@/lib/product/contracts";
import {
  bookDtoSelect,
  mapDatabaseError,
  parseBookRow,
  resolveProductSession,
  type ProductError,
} from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import {
  notFoundError,
  unavailableError,
  validationError,
} from "@/lib/product/dal/errors";
import {
  timerMaximumSeconds,
  timerMinimumSeconds,
} from "@/lib/product/contracts/timer";

const sessionColumns = "id,book_id,started_at,ended_at,duration_seconds,created_at";

function privateJson(body: TimerFinishSuccess, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  const response = productErrorResponse(error);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [
    `/${locale}/home`,
    `/${locale}/library`,
    `/${locale}/stats`,
    `/${locale}/books/${bookId}`,
    `/${locale}/reading/${bookId}`,
  ];
}

function parseSession(value: unknown): ReadingSession | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const parsed = ReadingSessionSchema.safeParse({
    id: row.id,
    bookId: row.book_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
  });
  return parsed.success ? parsed.data : null;
}

function parseBook(value: unknown): Book | null {
  const parsed = parseBookRow(value);
  return parsed.ok ? parsed.value : null;
}

function totalDuration(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  let total = 0;
  for (const row of rows) {
    if (typeof row !== "object" || row === null) return null;
    const duration = (row as Record<string, unknown>).duration_seconds;
    if (typeof duration !== "number" || !Number.isSafeInteger(duration) || duration < 0) return null;
    total += duration;
  }
  return total;
}

function refreshPaths(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

function savedResponse(input: {
  book: Book;
  session: ReadingSession | null;
  totalReadingSeconds: number;
  duplicate: boolean;
  reason: "minimum" | "max-duration" | null;
  paths: string[];
  kind?: "saved" | "discarded";
}): NextResponse {
  return privateJson({
    kind: input.kind ?? "saved",
    book: BookSchema.parse(input.book),
    session: input.session,
    totalReadingSeconds: input.totalReadingSeconds,
    duplicate: input.duplicate,
    reason: input.reason,
    invalidatedPaths: input.paths,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = TimerFinishRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const paths = invalidatedPaths(input.locale, input.bookId);
  const fixture = getConsumerRouteFixture(
    request.cookies.get("bookgolas-route-fixture")?.value,
  );
  if (fixture?.startsWith("timer-")) {
    const result = applyTimerFixture(fixture, input);
    if (!result.ok) return privateError(result.error);
    refreshPaths(paths);
    return savedResponse({ ...result.value, paths });
  }

  const session = await resolveProductSession();
  if (!session.ok) return privateError(session.error);

  const { supabase, userId } = session.value;
  const ownedBook = await supabase
    .from("books")
    .select(bookDtoSelect)
    .eq("id", input.bookId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (ownedBook.error) return privateError(mapDatabaseError(ownedBook.error));
  if (!ownedBook.data) return privateError(notFoundError());

  const book = parseBook(ownedBook.data);
  if (!book) return privateError(unavailableError("Book data is malformed."));

  const existing = await supabase
    .from("reading_sessions")
    .select(sessionColumns)
    .eq("id", input.idempotencyKey)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error) return privateError(mapDatabaseError(existing.error));
  if (existing.data) {
    const existingSession = parseSession(existing.data);
    if (!existingSession) return privateError(unavailableError("Reading session data is malformed."));
    refreshPaths(paths);
    return savedResponse({
      book,
      session: existingSession,
      totalReadingSeconds: book.totalReadingSeconds ?? 0,
      duplicate: true,
      reason: input.durationSeconds > timerMaximumSeconds ? "max-duration" : null,
      paths,
    });
  }

  const cappedDuration = Math.min(input.durationSeconds, timerMaximumSeconds);
  if (cappedDuration < timerMinimumSeconds) {
    refreshPaths(paths);
    return savedResponse({
      kind: "discarded",
      book,
      session: null,
      totalReadingSeconds: book.totalReadingSeconds ?? 0,
      duplicate: false,
      reason: "minimum",
      paths,
    });
  }

  const inserted = await supabase
    .from("reading_sessions")
    .insert({
      id: input.idempotencyKey,
      user_id: userId,
      book_id: input.bookId,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      duration_seconds: cappedDuration,
    })
    .select(sessionColumns)
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const replay = await supabase
        .from("reading_sessions")
        .select(sessionColumns)
        .eq("id", input.idempotencyKey)
        .eq("user_id", userId)
        .maybeSingle();
      const replaySession = replay.data ? parseSession(replay.data) : null;
      if (!replay.error && replaySession) {
        refreshPaths(paths);
        return savedResponse({
          book,
          session: replaySession,
          totalReadingSeconds: book.totalReadingSeconds ?? 0,
          duplicate: true,
          reason: input.durationSeconds > timerMaximumSeconds ? "max-duration" : null,
          paths,
        });
      }
    }
    return privateError(mapDatabaseError(inserted.error));
  }

  const savedSession = parseSession(inserted.data);
  if (!savedSession) return privateError(unavailableError("Reading session data is malformed."));

  const sessions = await supabase
    .from("reading_sessions")
    .select("duration_seconds")
    .eq("book_id", input.bookId)
    .eq("user_id", userId);
  if (sessions.error) return privateError(mapDatabaseError(sessions.error));
  const totalReadingSeconds = totalDuration(sessions.data);
  if (totalReadingSeconds === null) {
    return privateError(unavailableError("Reading session totals are malformed."));
  }

  const updated = await supabase
    .from("books")
    .update({
      total_reading_seconds: totalReadingSeconds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(bookDtoSelect)
    .maybeSingle();
  if (updated.error) return privateError(mapDatabaseError(updated.error));
  if (!updated.data) return privateError(notFoundError());

  const updatedBook = parseBook(updated.data);
  if (!updatedBook) return privateError(unavailableError("Book data is malformed."));
  refreshPaths(paths);
  return savedResponse({
    book: updatedBook,
    session: savedSession,
    totalReadingSeconds,
    duplicate: false,
    reason: input.durationSeconds > timerMaximumSeconds ? "max-duration" : null,
    paths,
  });
}
