import { describe, expect, it } from "vitest";
import {
  BookDetailRequestSchema,
  BookDetailResponseSchema,
  canApplyBookDetailAction,
} from "./book-detail";

const bookId = "00000000-0000-4000-8000-000000004331";

describe("book detail contract", () => {
  it("rejects caller supplied ownership fields and unknown request fields", () => {
    expect(() => BookDetailRequestSchema.parse({
      action: "pause",
      locale: "en",
      bookId,
      user_id: "00000000-0000-4000-8000-000000000001",
    })).toThrow();
    expect(() => BookDetailRequestSchema.parse({
      action: "pause",
      locale: "en",
      bookId,
      unexpected: true,
    })).toThrow();
  });

  it("keeps the native action matrix and target date restriction", () => {
    expect(canApplyBookDetailAction("planned", "start")).toBe(true);
    expect(canApplyBookDetailAction("planned", "pause")).toBe(false);
    expect(canApplyBookDetailAction("reading", "pause")).toBe(true);
    expect(canApplyBookDetailAction("reading", "complete")).toBe(true);
    expect(canApplyBookDetailAction("completed", "resume")).toBe(false);
    expect(canApplyBookDetailAction("will_retry", "resume")).toBe(true);
    expect(() => BookDetailRequestSchema.parse({
      action: "pause",
      locale: "ko",
      bookId,
      targetDate: "2026-09-30T00:00:00.000Z",
    })).toThrow();
    expect(BookDetailRequestSchema.parse({
      action: "resume",
      locale: "ko",
      bookId,
      targetDate: "2026-09-30T00:00:00.000Z",
    }).targetDate).toBe("2026-09-30T00:00:00.000Z");
  });

  it("accepts typed updated and deleted responses only", () => {
    const baseBook = {
      id: bookId,
      title: "Fixture book",
      author: "Author",
      startDate: "2026-09-01T00:00:00.000Z",
      targetDate: "2026-09-30T00:00:00.000Z",
      imageUrl: null,
      currentPage: 10,
      totalPages: 100,
      status: "reading" as const,
      attemptCount: 1,
      dailyTargetPages: 10,
      priority: 2,
      pausedAt: null,
      plannedStartDate: null,
      deletedAt: null,
      genre: "essay",
      publisher: "Publisher",
      isbn: "9780306406157",
      rating: null,
      review: null,
      reviewLink: null,
      aladinUrl: null,
      longReview: null,
      price: 1000,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    expect(BookDetailResponseSchema.parse({
      kind: "updated",
      action: "pause",
      book: { ...baseBook, status: "will_retry", pausedAt: "2026-09-16T00:00:00.000Z" },
      invalidatedPaths: ["/en/home", `/en/books/${bookId}`],
    }).kind).toBe("updated");
    expect(BookDetailResponseSchema.parse({
      kind: "deleted",
      action: "delete",
      book: null,
      invalidatedPaths: ["/ko/home", `/ko/books/${bookId}`],
    }).kind).toBe("deleted");
  });
});
