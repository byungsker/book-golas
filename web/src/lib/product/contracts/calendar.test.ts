import { describe, expect, it } from "vitest";
import {
  CalendarBookSchema,
  CalendarDataSchema,
  CalendarSourceProgressSchema,
  calendarDayKeyFromIso,
  buildCalendarData,
  getCalendarGridDays,
  getCalendarMonthBounds,
} from "./index";

const readingBook = CalendarBookSchema.parse({
  bookId: "00000000-0000-4000-8000-000000004391",
  title: "The Reading Atlas",
  author: "Mina Park",
  imageUrl: null,
  status: "reading" as const,
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  plannedStartDate: null,
  pausedAt: null,
});

describe("calendar contracts", () => {
  it("uses an explicit KST month boundary and keeps UTC midnight crossings deterministic", () => {
    const bounds = getCalendarMonthBounds(2026, 9);
    expect(bounds.start.toISOString()).toBe("2026-08-31T15:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-30T15:00:00.000Z");
    expect(calendarDayKeyFromIso("2026-09-01T14:59:59.000Z")).toBe("2026-09-01");
    expect(calendarDayKeyFromIso("2026-09-01T15:00:00.000Z")).toBe("2026-09-02");
  });

  it("builds a Sunday-first six-row grid", () => {
    const days = getCalendarGridDays(2026, 9);
    expect(days).toHaveLength(42);
    expect(days[0]).toBe("2026-08-30");
    expect(days[1]).toBe("2026-08-31");
    expect(days[2]).toBe("2026-09-01");
    expect(days.at(-1)).toBe("2026-10-10");
  });

  it("keeps stable progress and session events separate from planned markers", () => {
    const progress = CalendarSourceProgressSchema.parse({
      id: "00000000-0000-4000-8000-000000004392",
      bookId: readingBook.bookId,
      page: 25,
      previousPage: 10,
      readingTime: 600,
      occurredAt: "2026-09-01T15:00:00.000Z",
    });
    const data = buildCalendarData({
      year: 2026,
      month: 9,
      filter: "all",
      books: [readingBook],
      progress: [progress],
      sessions: [],
    });

    expect(CalendarDataSchema.parse(data)).toEqual(data);
    expect(data.days).toHaveLength(1);
    expect(data.days[0]).toMatchObject({ day: "2026-09-02", pagesRead: 15, eventCount: 1 });
    expect(data.days[0].books[0]).toMatchObject({ kind: "activity", eventCount: 1, pagesRead: 15 });
  });
});
