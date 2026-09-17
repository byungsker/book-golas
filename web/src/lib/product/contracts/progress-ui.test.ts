import { describe, expect, it } from "vitest";
import {
  ApiErrorSchema,
  ProgressUiRequestSchema,
  ProgressUiResponseSchema,
} from "./index";

const bookId = "00000000-0000-4000-8000-000000004341";
const request = {
  locale: "en" as const,
  bookId,
  currentPage: 100,
  expectedCurrentPage: 84,
  idempotencyKey: "00000000-0000-4000-8000-000000005341",
  readingTime: 900,
};

const book = {
  id: bookId,
  title: "The Reading Atlas",
  author: "Mina Park",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  currentPage: 100,
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
  aladinUrl: null,
  longReview: null,
  price: 18000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-16T00:05:00.000Z",
};

describe("progress UI contracts", () => {
  it("accepts bounded localized updates with reading time", () => {
    expect(ProgressUiRequestSchema.parse(request)).toEqual(request);
  });

  it("rejects caller identity, negative pages and excessive reading time", () => {
    expect(() => ProgressUiRequestSchema.parse({ ...request, user_id: "foreign" })).toThrow();
    expect(() => ProgressUiRequestSchema.parse({ ...request, currentPage: -1 })).toThrow();
    expect(() => ProgressUiRequestSchema.parse({ ...request, readingTime: 28_801 })).toThrow();
  });

  it("keeps book, history and recorded state in one success response", () => {
    const response = {
      kind: "updated" as const,
      book,
      history: [
        {
          id: "00000000-0000-4000-8000-000000005342",
          bookId,
          page: 100,
          previousPage: 84,
          readingTime: 900,
          createdAt: "2026-09-16T00:05:00.000Z",
        },
      ],
      historyRecorded: true,
      duplicate: false,
      invalidatedPaths: ["/en/home", `/en/books/${bookId}`],
    };
    expect(ProgressUiResponseSchema.parse(response)).toEqual(response);
  });

  it("models history failure as a retryable private API error", () => {
    const error = ApiErrorSchema.parse({
      code: "history_unavailable",
      status: 503,
      message: "Reading history could not be recorded.",
      retryable: true,
    });
    expect(ProgressUiResponseSchema.parse({ error })).toEqual({ error });
  });
});
