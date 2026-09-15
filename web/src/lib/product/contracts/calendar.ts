import { z } from "zod";
import { BookIdSchema, IsoDateSchema, RecordIdSchema } from "./common";

export const CALENDAR_TIME_ZONE = "Asia/Seoul" as const;

export const CalendarFilterSchema = z.enum(["all", "reading", "completed"]);
export type CalendarFilter = z.infer<typeof CalendarFilterSchema>;

export const CalendarBookStatusSchema = z.enum([
  "planned",
  "reading",
  "completed",
  "will_retry",
  "unknown",
]);
export type CalendarBookStatus = z.infer<typeof CalendarBookStatusSchema>;

export const CalendarEventKindSchema = z.enum(["progress", "session"]);
export type CalendarEventKind = z.infer<typeof CalendarEventKindSchema>;

export const CalendarDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type CalendarDayKey = z.infer<typeof CalendarDayKeySchema>;

export const CalendarBookSchema = z
  .object({
    bookId: BookIdSchema,
    title: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(500).nullable(),
    imageUrl: z.string().trim().min(1).nullable(),
    status: CalendarBookStatusSchema,
    startDate: IsoDateSchema,
    targetDate: IsoDateSchema,
    plannedStartDate: IsoDateSchema.nullable(),
    pausedAt: IsoDateSchema.nullable(),
  })
  .strict();

export const CalendarActivityEventSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    kind: CalendarEventKindSchema,
    day: CalendarDayKeySchema,
    occurredAt: IsoDateSchema,
    page: z.number().int().min(0).nullable(),
    previousPage: z.number().int().min(0).nullable(),
    pagesRead: z.number().int().min(0),
    durationSeconds: z.number().int().min(0).max(28_800),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.kind === "progress" && (event.page === null || event.previousPage === null)) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Progress events require page boundaries.",
      });
    }
    if (event.kind === "session" && (event.page !== null || event.previousPage !== null)) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Session events cannot claim page boundaries.",
      });
    }
  });
export type CalendarActivityEvent = z.infer<typeof CalendarActivityEventSchema>;

export const CalendarBookDaySchema = z
  .object({
    ...CalendarBookSchema.shape,
    kind: z.enum(["activity", "planned"]),
    pagesRead: z.number().int().min(0),
    durationSeconds: z.number().int().min(0).max(86_400),
    eventCount: z.number().int().min(0),
    lastActivityAt: IsoDateSchema.nullable(),
    events: z.array(CalendarActivityEventSchema),
  })
  .strict()
  .superRefine((book, context) => {
    if (book.kind === "activity" && book.eventCount === 0) {
      context.addIssue({
        code: "custom",
        path: ["eventCount"],
        message: "Activity rows require at least one stable source event.",
      });
    }
    if (book.eventCount !== book.events.length) {
      context.addIssue({
        code: "custom",
        path: ["eventCount"],
        message: "eventCount must match the source event list.",
      });
    }
  });
export type CalendarBookDay = z.infer<typeof CalendarBookDaySchema>;

export const CalendarDaySchema = z
  .object({
    day: CalendarDayKeySchema,
    pagesRead: z.number().int().min(0),
    durationSeconds: z.number().int().min(0).max(86_400),
    eventCount: z.number().int().min(0),
    books: z.array(CalendarBookDaySchema).min(1),
  })
  .strict();
export type CalendarDay = z.infer<typeof CalendarDaySchema>;

export const CalendarDataSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    timeZone: z.literal(CALENDAR_TIME_ZONE),
    filter: CalendarFilterSchema,
    monthlyBookCount: z.number().int().min(0),
    activeDayCount: z.number().int().min(0),
    days: z.array(CalendarDaySchema),
  })
  .strict();
export type CalendarData = z.infer<typeof CalendarDataSchema>;

export const CalendarSourceBookSchema = CalendarBookSchema;
export const CalendarSourceProgressSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    page: z.number().int().min(0),
    previousPage: z.number().int().min(0),
    readingTime: z.number().int().min(0).max(28_800).nullable(),
    occurredAt: IsoDateSchema,
  })
  .strict()
  .superRefine((event, context) => {
    if (event.page < event.previousPage) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Progress cannot move backwards.",
      });
    }
  });
export type CalendarSourceProgress = z.infer<typeof CalendarSourceProgressSchema>;

export const CalendarSourceSessionSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    startedAt: IsoDateSchema,
    endedAt: IsoDateSchema.nullable(),
    durationSeconds: z.number().int().min(0).max(28_800),
    createdAt: IsoDateSchema.nullable(),
  })
  .strict()
  .superRefine((session, context) => {
    if (session.endedAt && Date.parse(session.endedAt) < Date.parse(session.startedAt)) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "A reading session cannot end before it starts.",
      });
    }
  });
export type CalendarSourceSession = z.infer<typeof CalendarSourceSessionSchema>;

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

function datePart(value: Date, type: "year" | "month" | "day"): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    [type]: type === "year" ? "numeric" : "2-digit",
  }).formatToParts(value).find((item) => item.type === type)?.value;
  return part ?? "";
}

export function calendarDayKeyFromDate(value: Date): CalendarDayKey {
  const year = datePart(value, "year").padStart(4, "0");
  const month = datePart(value, "month").padStart(2, "0");
  const day = datePart(value, "day").padStart(2, "0");
  return CalendarDayKeySchema.parse(`${year}-${month}-${day}`);
}

export function calendarDayKeyFromIso(value: string): CalendarDayKey {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new RangeError("Calendar event timestamp is invalid.");
  return calendarDayKeyFromDate(parsed);
}

export function calendarDateFromDayKey(day: CalendarDayKey): Date {
  const parsed = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(day);
  if (!parsed) throw new RangeError("Calendar day key is invalid.");
  return new Date(Date.UTC(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]), 12));
}

export function currentCalendarMonth(): { readonly year: number; readonly month: number } {
  const today = calendarDayKeyFromDate(new Date());
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

export function calendarMonthKey(year: number, month: number): string {
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

type CalendarBook = z.infer<typeof CalendarBookSchema>;

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
