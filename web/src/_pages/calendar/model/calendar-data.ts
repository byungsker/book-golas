import { z } from "zod";
import {
  CalendarBookSchema,
  CalendarDayKeySchema,
  CALENDAR_TIME_ZONE,
  calendarDayKeyFromIso,
  type CalendarDayKey,
  type CalendarSourceProgress,
  type CalendarSourceSession,
} from "@/shared/api/contracts";
import {
  CalendarActivityEventSchema,
  CalendarBookDaySchema,
  CalendarDataSchema,
  CalendarDaySchema,
  type CalendarActivityEvent,
  type CalendarBookDay,
  type CalendarData,
  type CalendarDay,
  type CalendarFilter,
} from "../api/calendar-contracts";

type CalendarBook = z.infer<typeof CalendarBookSchema>;

export function getCalendarMonthBounds(year: number, month: number): {
  readonly start: Date;
  readonly end: Date;
} {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new RangeError("Calendar year is outside the supported range.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Calendar month is outside the supported range.");
  }

  const start = new Date(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`);
  const nextMonth = month === 12 ? year + 1 : year;
  const nextMonthNumber = month === 12 ? 1 : month + 1;
  const end = new Date(`${String(nextMonth).padStart(4, "0")}-${String(nextMonthNumber).padStart(2, "0")}-01T00:00:00+09:00`);
  return { start, end };
}

function calendarMonthKey(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function getCalendarGridDays(year: number, month: number): CalendarDayKey[] {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const firstWeekday = first.getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, 1 - firstWeekday + index, 12));
    return CalendarDayKeySchema.parse(date.toISOString().slice(0, 10));
  });
}

function shouldIncludeBook(book: CalendarBookDay, filter: CalendarFilter): boolean {
  if (filter === "completed") return book.status === "completed";
  if (filter === "reading") return book.status !== "completed";
  return true;
}

type MutableBookDay = {
  readonly book: CalendarBook;
  kind: "activity" | "planned";
  pagesRead: number;
  durationSeconds: number;
  lastActivityAt: string | null;
  events: CalendarActivityEvent[];
};

export function buildCalendarData(input: {
  year: number;
  month: number;
  filter: CalendarFilter;
  books: readonly CalendarBook[];
  progress: readonly CalendarSourceProgress[];
  sessions: readonly CalendarSourceSession[];
}): CalendarData {
  const bookById = new Map(input.books.map((book) => [book.bookId, book]));
  const byDay = new Map<string, Map<string, MutableBookDay>>();
  const monthPrefix = `${calendarMonthKey(input.year, input.month)}-`;

  const getBookDay = (day: CalendarDayKey, book: CalendarBook, kind: "activity" | "planned") => {
    let dayBooks = byDay.get(day);
    if (!dayBooks) {
      dayBooks = new Map();
      byDay.set(day, dayBooks);
    }
    const existing = dayBooks.get(book.bookId);
    if (existing) {
      if (kind === "activity") existing.kind = "activity";
      return existing;
    }
    const next: MutableBookDay = {
      book,
      kind,
      pagesRead: 0,
      durationSeconds: 0,
      lastActivityAt: null,
      events: [],
    };
    dayBooks.set(book.bookId, next);
    return next;
  };

  const addEvent = (event: CalendarActivityEvent, book: CalendarBook) => {
    if (!event.day.startsWith(monthPrefix)) return;
    const bookDay = getBookDay(event.day, book, "activity");
    bookDay.events.push(event);
    bookDay.pagesRead += event.pagesRead;
    bookDay.durationSeconds += event.durationSeconds;
    if (!bookDay.lastActivityAt || Date.parse(event.occurredAt) > Date.parse(bookDay.lastActivityAt)) {
      bookDay.lastActivityAt = event.occurredAt;
    }
  };

  for (const progress of input.progress) {
    const book = bookById.get(progress.bookId);
    if (!book) continue;
    const day = calendarDayKeyFromIso(progress.occurredAt);
    addEvent(
      CalendarActivityEventSchema.parse({
        id: progress.id,
        bookId: progress.bookId,
        kind: "progress",
        day,
        occurredAt: progress.occurredAt,
        page: progress.page,
        previousPage: progress.previousPage,
        pagesRead: progress.page - progress.previousPage,
        durationSeconds: progress.readingTime ?? 0,
      }),
      book,
    );
  }

  for (const session of input.sessions) {
    const book = bookById.get(session.bookId);
    if (!book) continue;
    const day = calendarDayKeyFromIso(session.startedAt);
    addEvent(
      CalendarActivityEventSchema.parse({
        id: session.id,
        bookId: session.bookId,
        kind: "session",
        day,
        occurredAt: session.startedAt,
        page: null,
        previousPage: null,
        pagesRead: 0,
        durationSeconds: session.durationSeconds,
      }),
      book,
    );
  }

  for (const book of input.books) {
    if (book.status !== "planned" || !book.plannedStartDate) continue;
    const day = calendarDayKeyFromIso(book.plannedStartDate);
    if (day.startsWith(monthPrefix)) getBookDay(day, book, "planned");
  }

  const days: CalendarDay[] = [];
  for (const [day, dayBooks] of [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const books = [...dayBooks.values()]
      .map((bookDay) => {
        bookDay.events.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
        return CalendarBookDaySchema.parse({
          ...bookDay.book,
          kind: bookDay.kind,
          pagesRead: bookDay.pagesRead,
          durationSeconds: bookDay.durationSeconds,
          eventCount: bookDay.events.length,
          lastActivityAt: bookDay.lastActivityAt,
          events: bookDay.events,
        });
      })
      .filter((book) => shouldIncludeBook(book, input.filter))
      .sort((left, right) => {
        const leftTime = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0;
        const rightTime = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0;
        return rightTime - leftTime || left.title.localeCompare(right.title);
      });
    if (books.length === 0) continue;
    days.push(
      CalendarDaySchema.parse({
        day,
        pagesRead: books.reduce((total, book) => total + book.pagesRead, 0),
        durationSeconds: books.reduce((total, book) => total + book.durationSeconds, 0),
        eventCount: books.reduce((total, book) => total + book.eventCount, 0),
        books,
      }),
    );
  }

  return CalendarDataSchema.parse({
    year: input.year,
    month: input.month,
    timeZone: CALENDAR_TIME_ZONE,
    filter: input.filter,
    monthlyBookCount: new Set(days.flatMap((day) => day.books.map((book) => book.bookId))).size,
    activeDayCount: days.length,
    days,
  });
}
