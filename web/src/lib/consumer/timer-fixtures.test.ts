import { describe, expect, it } from "vitest";
import {
  applyTimerFixture,
  getTimerFixtureBook,
} from "./timer-fixtures";
import {
  BookIdSchema,
  RequestIdSchema,
  type TimerFinishRequest,
} from "@/lib/product/contracts";

const bookId = BookIdSchema.parse("00000000-0000-4000-8000-000000004361");

function input(id: string, durationSeconds: number): TimerFinishRequest {
  return {
    action: "finish",
    locale: "en",
    bookId,
    startedAt: "2026-09-16T00:00:00.000Z",
    endedAt: "2026-09-16T00:20:00.000Z",
    durationSeconds,
    idempotencyKey: RequestIdSchema.parse(id),
  };
}

describe("timer fixtures", () => {
  it("returns an owned book and saves one normal session", () => {
    const book = getTimerFixtureBook("timer-happy", bookId);
    expect(book).toMatchObject({ ok: true, value: { id: bookId } });
    const result = applyTimerFixture("timer-happy", input("00000000-0000-4000-8000-000000005361", 1_200));
    expect(result).toMatchObject({ ok: true, value: { kind: "saved", duplicate: false, totalReadingSeconds: 4_800 } });
  });

  it("discards short sessions and caps long sessions", () => {
    const minimum = applyTimerFixture("timer-minimum", input("00000000-0000-4000-8000-000000005362", 29));
    expect(minimum).toMatchObject({ ok: true, value: { kind: "discarded", session: null, reason: "minimum" } });

    const maximum = applyTimerFixture("timer-over-max", input("00000000-0000-4000-8000-000000005363", 86_400));
    expect(maximum).toMatchObject({ ok: true, value: { kind: "saved", reason: "max-duration", session: { durationSeconds: 28_800 } } });
  });

  it("replays the same stop idempotently and keeps failures typed", () => {
    const request = input("00000000-0000-4000-8000-000000005364", 120);
    const first = applyTimerFixture("timer-duplicate", request);
    const second = applyTimerFixture("timer-duplicate", request);
    expect(first).toMatchObject({ ok: true, value: { duplicate: false } });
    expect(second).toMatchObject({ ok: true, value: { duplicate: true } });
    expect(applyTimerFixture("timer-offline", request)).toMatchObject({ ok: false, error: { code: "offline" } });
    expect(applyTimerFixture("timer-unauthorized", request)).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(getTimerFixtureBook("timer-foreign", bookId)).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
});
