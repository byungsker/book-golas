import { describe, expect, it, vi } from "vitest";
import {
  BookIdSchema,
  RecordIdSchema,
  ReadingAnalyticsBookSchema,
  ReadingAnalyticsRequestSchema,
  buildReadingAnalytics,
  currentReadingAnalyticsWeekStart,
  getReadingAnalyticsRange,
} from "@/lib/product/contracts";

const book = ReadingAnalyticsBookSchema.parse({
  bookId: BookIdSchema.parse("00000000-0000-4000-8000-000000004401"),
  title: "Analytics book",
  status: "reading" as const,
  genre: "Essay > Reading",
  attemptCount: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

describe("reading analytics contracts", () => {
  it("keeps KST boundaries and native page semantics explicit", () => {
    vi.setSystemTime(new Date("2026-09-16T03:00:00.000Z"));
    const request = ReadingAnalyticsRequestSchema.parse({
      view: "monthly",
      year: 2026,
      month: 9,
      status: "all",
    });
    const data = buildReadingAnalytics({
      request,
      books: [book],
      progress: [
        { id: RecordIdSchema.parse("00000000-0000-4000-8000-000000004402"), bookId: book.bookId, page: 20, previousPage: 0, readingTime: 60, occurredAt: "2026-09-01T14:59:59.000Z" },
        { id: RecordIdSchema.parse("00000000-0000-4000-8000-000000004403"), bookId: book.bookId, page: 32, previousPage: 20, readingTime: 60, occurredAt: "2026-09-01T15:00:00.000Z" },
      ],
      sessions: [],
    });

    expect(data.timeZone).toBe("Asia/Seoul");
    expect(data.daily.find((point) => point.day === "2026-09-01")?.pagesRead).toBe(20);
    expect(data.daily.find((point) => point.day === "2026-09-02")?.pagesRead).toBe(12);
    expect(data.periods.reduce((sum, point) => sum + point.pages, 0)).toBe(52);
    expect(data.metrics.totalPagesRead).toBe(32);
  });

  it("validates weekly Mondays and ordered custom ranges", () => {
    expect(() => ReadingAnalyticsRequestSchema.parse({ view: "weekly", year: 2026, weekStart: "2026-09-02", status: "all" })).toThrow();
    expect(() => ReadingAnalyticsRequestSchema.parse({ view: "custom", year: 2026, customStart: "2026-09-10", customEnd: "2026-09-01", status: "all" })).toThrow();
    vi.setSystemTime(new Date("2026-09-16T03:00:00.000Z"));
    expect(() => ReadingAnalyticsRequestSchema.parse({ view: "custom", year: 2026, customStart: "2026-09-01", customEnd: "2026-09-17", status: "all" })).toThrow();
    expect(getReadingAnalyticsRange(ReadingAnalyticsRequestSchema.parse({ view: "weekly", year: 2026, weekStart: "2026-09-07", status: "all" }))).toEqual({ startDay: "2026-09-07", endDay: "2026-09-13" });
    vi.useRealTimers();
  });

  it("uses the current KST week start", () => {
    vi.setSystemTime(new Date("2026-09-16T03:00:00.000Z"));
    expect(currentReadingAnalyticsWeekStart()).toBe("2026-09-14");
    vi.useRealTimers();
  });
});
