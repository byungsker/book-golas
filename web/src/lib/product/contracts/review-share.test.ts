import { describe, expect, it } from "vitest";
import {
  ReviewMutationSchema,
  ReviewResponseSchema,
  reviewShareCard,
} from "./review-share";
import { BookSchema } from "./books";

const bookId = "00000000-0000-4000-8000-000000004331";
const requestId = "00000000-0000-4000-8000-000000000437";

describe("review/share contracts", () => {
  it("accepts a complete save and AI generation request", () => {
    expect(ReviewMutationSchema.parse({
      action: "save",
      locale: "en",
      bookId,
      rating: 4,
      review: "A concise review.",
      longReview: "A longer reflection.",
      reviewLink: "https://bookgolas.example/reviews/431",
      idempotencyKey: requestId,
    })).toMatchObject({ action: "save", rating: 4 });
    expect(ReviewMutationSchema.parse({
      action: "generate",
      locale: "ko",
      bookId,
      aiConsent: true,
      idempotencyKey: requestId,
    })).toMatchObject({ action: "generate", aiConsent: true });
  });

  it("rejects insecure links, oversized review text and caller identity fields", () => {
    const save = {
      action: "save",
      locale: "en",
      bookId,
      rating: null,
      review: null,
      longReview: null,
      reviewLink: null,
      idempotencyKey: requestId,
    } as const;
    expect(() => ReviewMutationSchema.parse({ ...save, reviewLink: "http://unsafe.example/review" })).toThrow();
    expect(() => ReviewMutationSchema.parse({ ...save, longReview: "x".repeat(20_001) })).toThrow();
    expect(() => ReviewMutationSchema.parse({ ...save, user_id: "00000000-0000-4000-8000-000000000041" })).toThrow();
  });

  it("keeps the response typed and creates a stable text share card", () => {
    const book = BookSchema.parse({
      id: bookId,
      title: "The Reading Atlas",
      author: "Mina Park",
      startDate: "2026-09-01T00:00:00.000Z",
      targetDate: "2026-09-30T00:00:00.000Z",
      imageUrl: null,
      currentPage: 84,
      totalPages: 240,
      status: "reading",
      attemptCount: 1,
      dailyTargetPages: 18,
      priority: 2,
      pausedAt: null,
      plannedStartDate: null,
      deletedAt: null,
      genre: "essay",
      publisher: "Bookgolas Press",
      isbn: "9780306406157",
      rating: 4,
      review: "A concise review.",
      reviewLink: null,
      aladinUrl: null,
      longReview: "A longer reflection.",
      price: 18000,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    });
    const response = ReviewResponseSchema.parse({
      kind: "saved",
      book,
      canonicalUrl: "https://bookgolas.example/en/books/00000000-0000-4000-8000-000000004331/review",
      duplicate: false,
      invalidatedPaths: ["/en/books/00000000-0000-4000-8000-000000004331/review"],
    });
    expect(response.kind).toBe("saved");
    expect(reviewShareCard({ book, canonicalUrl: "https://bookgolas.example/en/books/00000000-0000-4000-8000-000000004331/review" })).toContain("Rating: 4/5");
  });
});
