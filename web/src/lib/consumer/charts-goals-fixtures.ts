import {
  buildReadingAnalytics,
  ReadingAnalyticsBookSchema,
  ReadingAnalyticsDataSchema,
  ReadingAnalyticsRequestSchema,
  ReadingAnalyticsSourceGoalSchema,
  type ReadingAnalyticsData,
  type ReadingAnalyticsRequest,
} from "@/lib/product/contracts";
import {
  consentRequiredError,
  failure,
  offlineError,
  quotaExceededError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import { getCalendarFixtureSources } from "@/lib/consumer/calendar-fixtures";

const fixtureGoalValues = new Map<string, number>();

const fixtureBookMetadata: Record<string, { genre: string | null; updatedAt: string | null; attemptCount: number }> = {
  "00000000-0000-4000-8000-000000004391": {
    genre: "Essay > Reading",
    updatedAt: "2026-09-12T00:00:00.000Z",
    attemptCount: 1,
  },
  "00000000-0000-4000-8000-000000004392": {
    genre: "Literature > Contemporary",
    updatedAt: "2026-09-10T00:00:00.000Z",
    attemptCount: 2,
  },
  "00000000-0000-4000-8000-000000004393": {
    genre: "Self-Help",
    updatedAt: "2026-09-11T00:00:00.000Z",
    attemptCount: 2,
  },
  "00000000-0000-4000-8000-000000004394": {
    genre: null,
    updatedAt: null,
    attemptCount: 1,
  },
};

function defaultGoal(fixture: string): number {
  return fixture === "charts-goals-goal" ? 24 : 12;
}

function fixtureBooks() {
  const sources = getCalendarFixtureSources();
  return sources.books.map((book) => ReadingAnalyticsBookSchema.parse({
    bookId: book.bookId,
    title: book.title,
    status: book.status,
    genre: fixtureBookMetadata[book.bookId]?.genre ?? null,
    attemptCount: fixtureBookMetadata[book.bookId]?.attemptCount ?? 1,
    createdAt: book.startDate,
    updatedAt: fixtureBookMetadata[book.bookId]?.updatedAt ?? null,
  }));
}

function fixtureRequest(input: ReadingAnalyticsRequest): ReadingAnalyticsRequest {
  return ReadingAnalyticsRequestSchema.parse(input);
}

export function getChartsGoalsFixture(input: {
  fixture: string;
  request: ReadingAnalyticsRequest;
}): ProductResult<ReadingAnalyticsData> {
  if (input.fixture === "charts-goals-unauthorized") return failure(unauthorizedError());
  if (input.fixture === "charts-goals-network" || input.fixture === "charts-goals-error") {
    return failure(unavailableError("Reading statistics are temporarily unavailable."));
  }
  if (input.fixture === "charts-goals-offline") return failure(offlineError("Reading statistics are offline."));
  if (input.fixture === "charts-goals-quota") return failure(quotaExceededError("Reading statistics quota is unavailable."));
  if (input.fixture === "charts-goals-consent") return failure(consentRequiredError("Reading statistics consent is required."));
  if (input.fixture === "charts-goals-invalid-range") return failure(validationError("The reading statistics range is invalid."));

  const sources = getCalendarFixtureSources();
  const isEmpty = input.fixture === "charts-goals-empty";
  const request = fixtureRequest(input.request);
  const goal = isEmpty
    ? null
    : ReadingAnalyticsSourceGoalSchema.parse({
        year: request.year,
        targetBooks: fixtureGoalValues.get(input.fixture) ?? defaultGoal(input.fixture),
      });
  const value = buildReadingAnalytics({
    request,
    books: isEmpty ? [] : fixtureBooks(),
    progress: isEmpty ? [] : sources.progress,
    sessions: isEmpty ? [] : sources.sessions,
    goal,
    freshness: input.fixture === "charts-goals-stale" ? "stale" : "fresh",
  });
  return { ok: true, value: ReadingAnalyticsDataSchema.parse(value) };
}

export function setChartsGoalsFixtureGoal(input: {
  fixture: string;
  year: number;
  targetBooks: number;
}): ProductResult<{ year: number; targetBooks: number }> {
  if (input.fixture === "charts-goals-unauthorized") return failure(unauthorizedError());
  if (input.fixture === "charts-goals-offline") return failure(offlineError("Reading statistics are offline."));
  if (input.fixture === "charts-goals-quota") return failure(quotaExceededError("Reading statistics quota is unavailable."));
  if (input.fixture === "charts-goals-consent") return failure(consentRequiredError("Reading statistics consent is required."));
  if (input.fixture === "charts-goals-network" || input.fixture === "charts-goals-error") {
    return failure(unavailableError("Reading statistics are temporarily unavailable."));
  }
  fixtureGoalValues.set(input.fixture, input.targetBooks);
  return { ok: true, value: { year: input.year, targetBooks: input.targetBooks } };
}
