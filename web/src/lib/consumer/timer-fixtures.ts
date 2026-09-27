import {
  BookSchema,
  ReadingSessionSchema,
  type Book,
  type ReadingSession,
  type TimerFinishRequest,
} from "@/lib/product/contracts";
import {
  conflictError,
  failure,
  notFoundError,
  offlineError,
  success,
  unauthorizedError,
  unavailableError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import { getBookDetailFixture } from "./book-detail-fixtures";

const fixtureNow = "2026-09-16T00:05:00.000Z";
const baseTotalReadingSeconds = 3_600;

export type TimerFixtureResult = {
  kind: "saved" | "discarded";
  book: Book;
  session: ReadingSession | null;
  totalReadingSeconds: number;
  duplicate: boolean;
  reason: "minimum" | "max-duration" | null;
};

const savedRequests = new Map<string, TimerFixtureResult>();

function fixtureBook(fixture: string, bookId: string): Book | null {
  if (fixture === "timer-foreign" || fixture === "timer-deleted") return null;
  const result = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
  if (!result.ok) return null;
  return BookSchema.parse({
    ...result.value,
    id: bookId,
    totalReadingSeconds: baseTotalReadingSeconds,
    updatedAt: fixtureNow,
  });
}

export function getTimerFixtureBook(fixture: string, bookId: string): ProductResult<Book> {
  const book = fixtureBook(fixture, bookId);
  return book ? success(book) : failure(notFoundError());
}

function cloneResult(result: TimerFixtureResult, duplicate = result.duplicate): TimerFixtureResult {
  return {
    ...result,
    book: { ...result.book },
    session: result.session ? { ...result.session } : null,
    duplicate,
  };
}

export function applyTimerFixture(
  fixture: string,
  input: TimerFinishRequest,
): ProductResult<TimerFixtureResult> {
  if (fixture === "timer-error") return failure(unavailableError("The reading session could not be saved."));
  if (fixture === "timer-offline") return failure(offlineError("The reading session is offline."));
  if (fixture === "timer-unauthorized") return failure(unauthorizedError());
  if (fixture === "timer-foreign" || fixture === "timer-deleted") return failure(notFoundError());
  if (fixture === "timer-conflict") return failure(conflictError());

  const book = fixtureBook(fixture, input.bookId);
  if (!book) return failure(notFoundError());

  const requestKey = `${fixture}:${input.bookId}:${input.idempotencyKey}`;
  const previous = savedRequests.get(requestKey);
  if (previous) {
    return success(cloneResult(previous, true));
  }

  const cappedDuration = Math.min(input.durationSeconds, 28_800);
  if (cappedDuration < 30) {
    const result: TimerFixtureResult = {
      kind: "discarded",
      book,
      session: null,
      totalReadingSeconds: book.totalReadingSeconds ?? baseTotalReadingSeconds,
      duplicate: false,
      reason: "minimum",
    };
    savedRequests.set(requestKey, result);
    return success(cloneResult(result));
  }

  const session = ReadingSessionSchema.parse({
    id: input.idempotencyKey,
    bookId: input.bookId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSeconds: cappedDuration,
    createdAt: fixtureNow,
  });
  const totalReadingSeconds = (book.totalReadingSeconds ?? baseTotalReadingSeconds) + cappedDuration;
  const result: TimerFixtureResult = {
    kind: "saved",
    book: BookSchema.parse({ ...book, totalReadingSeconds, updatedAt: fixtureNow }),
    session,
    totalReadingSeconds,
    duplicate: false,
    reason: input.durationSeconds > 28_800 ? "max-duration" : null,
  };
  savedRequests.set(requestKey, result);
  return success(cloneResult(result));
}
