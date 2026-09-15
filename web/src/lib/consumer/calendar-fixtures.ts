import {
  buildCalendarData,
  CalendarBookSchema,
  CalendarDataSchema,
  CalendarSourceProgressSchema,
  CalendarSourceSessionSchema,
  type CalendarData,
  type CalendarFilter,
  type CalendarSourceProgress,
  type CalendarSourceSession,
} from "@/lib/product/contracts";
import {
  consentRequiredError,
  failure,
  offlineError,
  quotaExceededError,
  unauthorizedError,
  unavailableError,
  type ProductResult,
} from "@/lib/product/dal/errors";

const commonBook = {
  author: "Mina Park",
  imageUrl: null,
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  plannedStartDate: null,
  pausedAt: null,
} as const;

const fixtureBooks = [
  CalendarBookSchema.parse({
    ...commonBook,
    bookId: "00000000-0000-4000-8000-000000004391",
    title: "The Reading Atlas",
    status: "reading",
  }),
  CalendarBookSchema.parse({
    ...commonBook,
    bookId: "00000000-0000-4000-8000-000000004392",
    title: "Finished Signals",
    status: "completed",
  }),
  CalendarBookSchema.parse({
    ...commonBook,
    bookId: "00000000-0000-4000-8000-000000004393",
    title: "Try Again Tomorrow",
    status: "will_retry",
    pausedAt: "2026-09-11T00:00:00.000Z",
  }),
  CalendarBookSchema.parse({
    ...commonBook,
    bookId: "00000000-0000-4000-8000-000000004394",
    title: "The Quiet Shelf",
    status: "planned",
    plannedStartDate: "2026-09-20T00:00:00.000Z",
  }),
];

const fixtureProgress: CalendarSourceProgress[] = [
  CalendarSourceProgressSchema.parse({
    id: "00000000-0000-4000-8000-000000004391",
    bookId: "00000000-0000-4000-8000-000000004391",
    page: 20,
    previousPage: 0,
    readingTime: 900,
    occurredAt: "2026-09-01T14:59:59.000Z",
  }),
  CalendarSourceProgressSchema.parse({
    id: "00000000-0000-4000-8000-000000004392",
    bookId: "00000000-0000-4000-8000-000000004391",
    page: 32,
    previousPage: 20,
    readingTime: 600,
    occurredAt: "2026-09-01T15:00:00.000Z",
  }),
  CalendarSourceProgressSchema.parse({
    id: "00000000-0000-4000-8000-000000004393",
    bookId: "00000000-0000-4000-8000-000000004392",
    page: 240,
    previousPage: 224,
    readingTime: 1_200,
    occurredAt: "2026-09-09T15:00:00.000Z",
  }),
  CalendarSourceProgressSchema.parse({
    id: "00000000-0000-4000-8000-000000004394",
    bookId: "00000000-0000-4000-8000-000000004393",
    page: 52,
    previousPage: 40,
    readingTime: 900,
    occurredAt: "2026-09-11T00:00:00.000Z",
  }),
];

const fixtureSessions: CalendarSourceSession[] = [
  CalendarSourceSessionSchema.parse({
    id: "00000000-0000-4000-8000-000000004395",
    bookId: "00000000-0000-4000-8000-000000004391",
    startedAt: "2026-09-05T23:30:00.000Z",
    endedAt: "2026-09-06T00:00:00.000Z",
    durationSeconds: 1_800,
    createdAt: "2026-09-06T00:00:00.000Z",
  }),
  CalendarSourceSessionSchema.parse({
    id: "00000000-0000-4000-8000-000000004396",
    bookId: "00000000-0000-4000-8000-000000004392",
    startedAt: "2026-09-09T14:30:00.000Z",
    endedAt: "2026-09-09T15:00:00.000Z",
    durationSeconds: 1_800,
    createdAt: "2026-09-09T15:00:00.000Z",
  }),
];

const foreignProgress = CalendarSourceProgressSchema.parse({
  id: "00000000-0000-4000-8000-000000004397",
  bookId: "00000000-0000-4000-8000-000000004398",
  page: 99,
  previousPage: 0,
  readingTime: 900,
  occurredAt: "2026-09-12T00:00:00.000Z",
});

function fixtureData(year: number, month: number, filter: CalendarFilter, fixture: string): CalendarData {
  const isSeptember = year === 2026 && month === 9;
  if (!isSeptember || fixture === "calendar-empty") {
    return buildCalendarData({ year, month, filter, books: [], progress: [], sessions: [] });
  }

  const progress = fixture === "calendar-foreign" || fixture === "calendar-deleted"
    ? [...fixtureProgress, foreignProgress]
    : fixtureProgress;
  return buildCalendarData({
    year,
    month,
    filter,
    books: fixtureBooks,
    progress,
    sessions: fixtureSessions,
  });
}

export function getCalendarFixture(input: {
  fixture: string;
  year: number;
  month: number;
  filter: CalendarFilter;
}): ProductResult<CalendarData> {
  if (input.fixture === "calendar-unauthorized") return failure(unauthorizedError());
  if (input.fixture === "calendar-network" || input.fixture === "calendar-error") {
    return failure(unavailableError("Calendar data is temporarily unavailable."));
  }
  if (input.fixture === "calendar-offline") return failure(offlineError("Calendar data is offline."));
  if (input.fixture === "calendar-quota") return failure(quotaExceededError("Calendar history quota is unavailable."));
  if (input.fixture === "calendar-consent") return failure(consentRequiredError("Calendar consent is required."));

  return { ok: true, value: CalendarDataSchema.parse(fixtureData(input.year, input.month, input.filter, input.fixture)) };
}

export function getCalendarFixtureBookIds(): string[] {
  return fixtureBooks.map((book) => book.bookId);
}
