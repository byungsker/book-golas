import { describe, expect, it } from "vitest";
import {
  BookLifecycleCreateRequestSchema,
  BookLifecycleRequestSchema,
  BookSchedulePreviewSchema,
  canTransitionBookStatus,
  getBookSchedulePreview,
} from "./book-lifecycle";

const book = {
  title: "Fixture book",
  author: "Fixture author",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-15T00:00:00.000Z",
  plannedStartDate: "2026-09-01T00:00:00.000Z",
  totalPages: 240,
  status: "planned" as const,
  imageUrl: null,
  genre: "essay",
  publisher: "Bookgolas Press",
  isbn: "9780306406157",
  aladinUrl: null,
  price: 18000,
  dailyTargetPages: 18,
  priority: 2,
};

describe("book lifecycle contract", () => {
  it("accepts a planned create request with native metadata and schedule fields", () => {
    expect(
      BookLifecycleCreateRequestSchema.parse({ action: "create", locale: "ko", book }),
    ).toMatchObject({ book: { status: "planned", plannedStartDate: book.plannedStartDate } });
  });

  it("rejects negative pages, reversed dates, invalid priority and arbitrary status", () => {
    expect(() => BookLifecycleRequestSchema.parse({ action: "create", locale: "en", book: { ...book, totalPages: -1 } })).toThrow();
    expect(() => BookLifecycleRequestSchema.parse({ action: "create", locale: "en", book: { ...book, targetDate: "2026-08-31T00:00:00.000Z" } })).toThrow();
    expect(() => BookLifecycleRequestSchema.parse({ action: "create", locale: "en", book: { ...book, priority: 5 } })).toThrow();
    expect(() => BookLifecycleRequestSchema.parse({ action: "create", locale: "en", book: { ...book, status: "paused" } })).toThrow();
  });

  it("does not accept a caller supplied ownership identity", () => {
    expect(() => BookLifecycleRequestSchema.parse({ action: "create", locale: "en", book: { ...book, user_id: "00000000-0000-4000-8000-000000000041" } })).toThrow();
  });

  it("keeps the native canonical status transitions", () => {
    expect(canTransitionBookStatus("planned", "reading")).toBe(true);
    expect(canTransitionBookStatus("reading", "completed")).toBe(true);
    expect(canTransitionBookStatus("reading", "will_retry")).toBe(true);
    expect(canTransitionBookStatus("will_retry", "reading")).toBe(true);
    expect(canTransitionBookStatus("completed", "reading")).toBe(false);
    expect(canTransitionBookStatus("planned", "completed")).toBe(false);
  });

  it("normalizes dates and calculates a positive daily schedule", () => {
    expect(getBookSchedulePreview({
      startDate: "2026-09-01T08:00:00+09:00",
      targetDate: "2026-09-15T08:00:00+09:00",
      totalPages: 240,
    })).toEqual({
      startDate: "2026-08-31T23:00:00.000Z",
      targetDate: "2026-09-14T23:00:00.000Z",
      totalPages: 240,
      targetDays: 14,
      dailyTargetPages: 18,
    });
    expect(() => BookSchedulePreviewSchema.parse({
      startDate: "2026-09-15T00:00:00.000Z",
      targetDate: "2026-09-01T00:00:00.000Z",
      totalPages: 240,
      targetDays: 1,
      dailyTargetPages: 240,
    })).toThrow();
  });
});
