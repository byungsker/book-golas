import {
  CalendarSourceProgressSchema,
} from "@/shared/api/contracts";
import {
  CalendarDataSchema,
  type CalendarData,
  type CalendarFilter,
} from "../api/calendar-contracts";
import { buildCalendarData } from "./calendar-data";
import { getConsumerAnalyticsFixtureSources } from "@/shared/config";
import {
  consentRequiredError,
  failure,
  offlineError,
  quotaExceededError,
  unauthorizedError,
  unavailableError,
  type ProductResult,
} from "@/shared/api/product/errors";

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

  const sources = getConsumerAnalyticsFixtureSources();
  const progress = fixture === "calendar-foreign" || fixture === "calendar-deleted"
    ? [...sources.progress, foreignProgress]
    : sources.progress;
  return buildCalendarData({
    year,
    month,
    filter,
    books: sources.books,
    progress,
    sessions: sources.sessions,
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
  return getConsumerAnalyticsFixtureSources().books.map((book) => book.bookId);
}
