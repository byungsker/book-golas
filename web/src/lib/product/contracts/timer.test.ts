import { describe, expect, it } from "vitest";
import {
  TimerFinishRequestSchema,
  TimerFinishSuccessSchema,
  timerMaximumSeconds,
  timerRequestMaximumSeconds,
} from "./timer";

const bookId = "00000000-0000-4000-8000-000000004361";
const sessionId = "00000000-0000-4000-8000-000000005361";
const request = {
  action: "finish" as const,
  locale: "en" as const,
  bookId,
  startedAt: "2026-09-16T00:00:00.000Z",
  endedAt: "2026-09-16T00:20:00.000Z",
  durationSeconds: 1_200,
  idempotencyKey: sessionId,
};

const book = {
  id: bookId,
  title: "The Reading Atlas",
  author: "Mina Park",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  currentPage: 84,
  totalPages: 240,
  totalReadingSeconds: 1_200,
  status: "reading" as const,
  attemptCount: 1,
  dailyTargetPages: 18,
  priority: 2,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Bookgolas Press",
  isbn: "9780306406157",
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: 18_000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-16T00:20:00.000Z",
};

describe("reading timer contracts", () => {
  it("accepts a localized finish request and a bounded saved response", () => {
    expect(TimerFinishRequestSchema.parse(request)).toEqual(request);
    expect(
      TimerFinishSuccessSchema.parse({
        kind: "saved",
        book,
        session: {
          id: sessionId,
          bookId,
          startedAt: request.startedAt,
          endedAt: request.endedAt,
          durationSeconds: request.durationSeconds,
          createdAt: request.endedAt,
        },
        totalReadingSeconds: 1_200,
        duplicate: false,
        reason: null,
        invalidatedPaths: ["/en/books/" + bookId],
      }),
    ).toMatchObject({ kind: "saved", totalReadingSeconds: 1_200 });
  });

  it("rejects caller identity, reversed dates and requests above the transport bound", () => {
    expect(() => TimerFinishRequestSchema.parse({ ...request, user_id: "foreign-user" })).toThrow();
    expect(() => TimerFinishRequestSchema.parse({
      ...request,
      endedAt: "2026-09-15T23:59:00.000Z",
    })).toThrow();
    expect(() => TimerFinishRequestSchema.parse({
      ...request,
      durationSeconds: timerRequestMaximumSeconds + 1,
    })).toThrow();
  });

  it("keeps the native eight-hour session ceiling explicit", () => {
    expect(timerMaximumSeconds).toBe(28_800);
  });
});
