import type { ConsumerBook } from "./types";
import {
  BookSchema,
  canApplyBookDetailAction,
  type Book,
  type BookDetailAction,
} from "@/lib/product/contracts";
import {
  conflictError,
  failure,
  notFoundError,
  success,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";

const fixtureUserId = "00000000-0000-4000-8000-000000000001";
const now = "2026-09-16T00:00:00.000Z";

const bookDefaults = {
  author: "Mina Park",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  currentPage: 84,
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
  review: "A useful companion for a deliberate reading pace.",
  reviewLink: "https://bookgolas.invalid/reviews/431",
  aladinUrl: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=431",
  longReview: "The ideas stayed useful after the final page.",
  price: 18000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: now,
} satisfies Omit<Book, "id" | "title">;

const fixtureBooks = {
  reading: BookSchema.parse({
    ...bookDefaults,
    id: "00000000-0000-4000-8000-000000004331",
    title: "The Reading Atlas",
  }),
  planned: BookSchema.parse({
    ...bookDefaults,
    id: "00000000-0000-4000-8000-000000004332",
    title: "The Quiet Shelf",
    status: "planned",
    currentPage: 0,
    plannedStartDate: "2026-09-20T00:00:00.000Z",
    review: null,
    reviewLink: null,
    longReview: null,
  }),
  paused: BookSchema.parse({
    ...bookDefaults,
    id: "00000000-0000-4000-8000-000000004333",
    title: "Try Again Tomorrow",
    status: "will_retry",
    pausedAt: "2026-09-11T00:00:00.000Z",
    review: null,
    reviewLink: null,
    longReview: null,
  }),
  completed: BookSchema.parse({
    ...bookDefaults,
    id: "00000000-0000-4000-8000-000000004334",
    title: "Finished Signals",
    status: "completed",
    currentPage: 240,
    rating: 5,
  }),
} satisfies Record<string, Book>;

function fixtureBookFor(input: { fixture: string; bookId: string }): Book | null {
  const byId = Object.values(fixtureBooks).find((book) => book.id === input.bookId);
  if (byId) return byId;
  if (input.fixture.includes("planned")) return fixtureBooks.planned;
  if (input.fixture.includes("paused")) return fixtureBooks.paused;
  if (input.fixture.includes("completed")) return fixtureBooks.completed;
  if (input.fixture.includes("reading") || input.fixture.includes("success") || input.fixture.includes("delete") || input.fixture.includes("invalid-transition")) return fixtureBooks.reading;
  return null;
}

export function getBookDetailFixture(input: {
  fixture: string;
  bookId: string;
}): ProductResult<Book> {
  if (input.fixture === "book-detail-foreign" || input.fixture === "book-detail-deleted") {
    return failure(notFoundError());
  }
  const book = fixtureBookFor(input);
  return book ? success(book) : failure(notFoundError());
}

export function applyBookDetailFixtureAction(input: {
  fixture: string;
  action: BookDetailAction;
  bookId: string;
  targetDate?: string;
}): ProductResult<Book> {
  if (input.fixture === "book-detail-foreign" || input.fixture === "book-detail-deleted") {
    return failure(notFoundError());
  }
  if (input.fixture === "book-detail-conflict") return failure(conflictError());

  const current = fixtureBookFor(input);
  if (!current) return failure(notFoundError());
  if (!canApplyBookDetailAction(current.status, input.action)) {
    return failure(validationError("This book action is not available for its current status."));
  }
  if (input.action === "delete") return success(current);

  const updated = {
    ...current,
    status: input.action === "pause"
      ? "will_retry"
      : input.action === "complete"
        ? "completed"
        : "reading",
    startDate: input.action === "start" || input.action === "resume" ? now : current.startDate,
    targetDate: input.targetDate ?? current.targetDate,
    pausedAt: input.action === "pause" ? now : null,
    plannedStartDate: input.action === "start" || input.action === "resume" ? null : current.plannedStartDate,
    attemptCount: input.action === "resume" ? current.attemptCount + 1 : current.attemptCount,
    updatedAt: "2026-09-16T00:05:00.000Z",
  } satisfies Book;
  return success(BookSchema.parse(updated));
}

export function getBookDetailFixtureConsumerBook(input: {
  fixture: string;
  bookId: string;
}): ConsumerBook | null {
  const result = getBookDetailFixture(input);
  if (!result.ok) return null;
  const book = result.value;
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

export { fixtureUserId };
