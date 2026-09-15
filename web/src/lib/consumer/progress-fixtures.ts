import {
  BookSchema,
  ProgressEventSchema,
  type Book,
  type ProgressEvent,
  type ProgressUiRequest,
} from "@/lib/product/contracts";
import {
  conflictError,
  failure,
  historyUnavailableError,
  notFoundError,
  offlineError,
  quotaExceededError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import type { ConsumerBook } from "./types";

const fixtureUserId = "00000000-0000-0000-0000-000000000001";
const fixtureNow = "2026-09-16T00:00:00.000Z";
const fixtureUpdatedAt = "2026-09-16T00:05:00.000Z";

const baseBook = {
  title: "The Reading Atlas",
  author: "Mina Park",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  totalPages: 240,
  status: "reading" as const,
  attemptCount: 1,
  dailyTargetPages: 18,
  priority: 2,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Bookgolas Press",
  isbn: "9780306406157",
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=434",
  longReview: null,
  price: 18000,
  createdAt: fixtureNow,
  updatedAt: fixtureNow,
} satisfies Omit<Book, "id" | "currentPage">;

const errors: Record<string, ProductError> = {
  "progress-unauthorized": unauthorizedError(),
  "progress-consent": {
    code: "consent_required",
    status: 403,
    message: "Progress consent is required.",
    retryable: false,
  },
  "progress-quota": quotaExceededError("Progress quota exceeded."),
  "progress-offline": offlineError("Progress is offline."),
  "progress-server-error": historyUnavailableError(
    "Reading history could not be recorded.",
  ),
  "progress-unavailable": unavailableError("Progress is temporarily unavailable."),
};

type ProgressFixtureSuccess = {
  book: Book;
  history: ProgressEvent[];
  historyRecorded: boolean;
  duplicate: boolean;
};

const duplicateRequests = new Map<
  string,
  { request: ProgressUiRequest; result: ProgressFixtureSuccess }
>();
const fixtureStates = new Map<string, { book: Book; history: ProgressEvent[] }>();

function fixtureBook(fixture: string, bookId: string): Book {
  const isRetry = fixture === "progress-retry";
  const isComplete = fixture === "progress-complete";
  return BookSchema.parse({
    ...baseBook,
    id: bookId,
    title: isRetry ? "Try Again Tomorrow" : isComplete ? "Finished Signals" : baseBook.title,
    currentPage: isComplete ? 239 : isRetry ? 40 : fixture === "progress-empty" ? 0 : 84,
    status: isRetry ? "will_retry" : baseBook.status,
    attemptCount: isRetry ? 2 : 1,
    pausedAt: isRetry ? "2026-09-11T00:00:00.000Z" : null,
    updatedAt: fixtureNow,
  });
}

function fixtureEvent(
  id: string,
  bookId: string,
  page: number,
  previousPage: number,
  createdAt: string,
): ProgressEvent {
  return ProgressEventSchema.parse({
    id,
    bookId,
    page,
    previousPage,
    readingTime: 900,
    createdAt,
  });
}

function fixtureHistory(fixture: string, bookId: string): ProgressEvent[] {
  if (fixture === "progress-empty") return [];
  if (fixture === "progress-retry") {
    return [
      fixtureEvent(
        "00000000-0000-4000-8000-000000004341",
        bookId,
        22,
        0,
        "2026-09-08T00:00:00.000Z",
      ),
      fixtureEvent(
        "00000000-0000-4000-8000-000000004342",
        bookId,
        40,
        22,
        "2026-09-10T00:00:00.000Z",
      ),
    ];
  }
  if (fixture === "progress-complete") {
    return [
      fixtureEvent(
        "00000000-0000-4000-8000-000000004343",
        bookId,
        180,
        120,
        "2026-09-12T00:00:00.000Z",
      ),
      fixtureEvent(
        "00000000-0000-4000-8000-000000004344",
        bookId,
        239,
        180,
        "2026-09-15T00:00:00.000Z",
      ),
    ];
  }
  return [
    fixtureEvent(
      "00000000-0000-4000-8000-000000004345",
      bookId,
      50,
      24,
      "2026-09-10T00:00:00.000Z",
    ),
    fixtureEvent(
      "00000000-0000-4000-8000-000000004346",
      bookId,
      84,
      50,
      "2026-09-15T00:00:00.000Z",
    ),
  ];
}

export function getProgressFixtureSnapshot(input: {
  fixture: string;
  bookId: string;
}): { book: Book; history: ProgressEvent[] } | null {
  if (input.fixture === "progress-foreign" || input.fixture === "progress-deleted") {
    return null;
  }
  const stored = fixtureStates.get(`${input.fixture}:${input.bookId}`);
  if (stored) {
    return {
      book: { ...stored.book },
      history: stored.history.map((event) => ({ ...event })),
    };
  }
  return {
    book: fixtureBook(input.fixture, input.bookId),
    history: fixtureHistory(input.fixture, input.bookId),
  };
}

export function getProgressFixtureConsumerBook(input: {
  fixture: string;
  bookId: string;
}): ConsumerBook | null {
  const snapshot = getProgressFixtureSnapshot(input);
  if (!snapshot) return null;
  const { book } = snapshot;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    startDate: book.startDate,
    targetDate: book.targetDate,
    plannedStartDate: book.plannedStartDate,
    imageUrl: book.imageUrl,
    currentPage: book.currentPage,
    totalPages: book.totalPages,
    status: book.status,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    pausedAt: book.pausedAt,
  };
}

function cloneResult(result: ProgressFixtureSuccess, duplicate = result.duplicate): ProgressFixtureSuccess {
  return {
    book: { ...result.book },
    history: result.history.map((event) => ({ ...event })),
    historyRecorded: result.historyRecorded,
    duplicate,
  };
}

function sameRequest(left: ProgressUiRequest, right: ProgressUiRequest): boolean {
  return (
    left.bookId === right.bookId &&
    left.currentPage === right.currentPage &&
    left.expectedCurrentPage === right.expectedCurrentPage &&
    left.readingTime === right.readingTime
  );
}

export function applyProgressFixture(
  fixture: string,
  input: ProgressUiRequest,
): ProductResult<ProgressFixtureSuccess> {
  const fixtureError = errors[fixture];
  if (fixtureError) return failure(fixtureError);
  if (fixture === "progress-stale") return failure(conflictError());
  if (fixture === "progress-foreign" || fixture === "progress-deleted") {
    return failure(notFoundError());
  }

  const snapshot = getProgressFixtureSnapshot({ fixture, bookId: input.bookId });
  if (!snapshot) return failure(notFoundError());

  if (fixture === "progress-duplicate") {
    const requestKey = `${input.bookId}:${input.idempotencyKey}`;
    const previous = duplicateRequests.get(requestKey);
    if (previous) {
      if (!sameRequest(previous.request, input)) {
        return failure(conflictError("This idempotency key was already used for another progress update."));
      }
      return { ok: true, value: cloneResult(previous.result, true) };
    }
  }

  if (input.expectedCurrentPage !== snapshot.book.currentPage) {
    return failure(conflictError());
  }
  if (input.currentPage > snapshot.book.totalPages) {
    return failure(validationError("Current page must not exceed the total page count."));
  }

  const historyRecorded = input.currentPage > snapshot.book.currentPage;
  const nextStatus =
    snapshot.book.totalPages > 0 && input.currentPage >= snapshot.book.totalPages
      ? "completed"
      : snapshot.book.status;
  const updatedBook = BookSchema.parse({
    ...snapshot.book,
    currentPage: input.currentPage,
    status: nextStatus,
    updatedAt: fixtureUpdatedAt,
  });
  const history = historyRecorded
    ? [
        ...snapshot.history,
        fixtureEvent(
          input.idempotencyKey,
          input.bookId,
          input.currentPage,
          snapshot.book.currentPage,
          fixtureUpdatedAt,
        ),
      ]
    : snapshot.history;
  const result: ProgressFixtureSuccess = {
    book: updatedBook,
    history,
    historyRecorded,
    duplicate: false,
  };

  if (fixture === "progress-duplicate") {
    duplicateRequests.set(`${input.bookId}:${input.idempotencyKey}`, { request: input, result });
  }
  fixtureStates.set(`${fixture}:${input.bookId}`, {
    book: { ...updatedBook },
    history: history.map((event) => ({ ...event })),
  });

  return { ok: true, value: cloneResult(result) };
}

export function getProgressFixtureUserId(): string {
  return fixtureUserId;
}
