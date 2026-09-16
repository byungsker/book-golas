import { describe, expect, it } from "vitest";
import { applyProgressFixture, getProgressFixtureSnapshot } from "./progress-fixtures";
import { BookIdSchema, RequestIdSchema } from "@/lib/product/contracts";

const bookId = BookIdSchema.parse("00000000-0000-4000-8000-000000004341");

function input(overrides: Partial<{
  bookId: string;
  currentPage: number;
  expectedCurrentPage: number;
  idempotencyKey: string;
}> = {}) {
  return {
    locale: "en" as const,
    bookId: BookIdSchema.parse(overrides.bookId ?? bookId),
    currentPage: overrides.currentPage ?? 100,
    expectedCurrentPage: overrides.expectedCurrentPage ?? 84,
    idempotencyKey: RequestIdSchema.parse(overrides.idempotencyKey ?? "00000000-0000-4000-8000-000000005343"),
    readingTime: 900,
  };
}

describe("progress fixtures", () => {
  it("models forward, backward, completion and retry states", () => {
    const forward = getProgressFixtureSnapshot({ fixture: "progress-forward", bookId });
    const complete = getProgressFixtureSnapshot({ fixture: "progress-complete", bookId });
    const retry = getProgressFixtureSnapshot({ fixture: "progress-retry", bookId });

    expect(forward?.book.currentPage).toBe(84);
    expect(complete?.book.currentPage).toBe(239);
    expect(retry?.book.status).toBe("will_retry");
    expect(retry?.book.attemptCount).toBe(2);
  });

  it("records only forward changes and marks total-page completion", () => {
    const forward = applyProgressFixture("progress-forward", input());
    expect(forward).toMatchObject({ ok: true, value: { historyRecorded: true, duplicate: false } });
    if (!forward.ok) throw new Error("forward fixture should succeed");
    expect(forward.value.history.at(-1)).toMatchObject({ page: 100, previousPage: 84 });

    const backward = applyProgressFixture("progress-forward", input({ bookId: BookIdSchema.parse("00000000-0000-4000-8000-000000004342"), currentPage: 40, expectedCurrentPage: 84 }));
    expect(backward).toMatchObject({ ok: true, value: { historyRecorded: false } });

    const complete = applyProgressFixture("progress-complete", input({ currentPage: 240, expectedCurrentPage: 239 }));
    expect(complete).toMatchObject({ ok: true, value: { book: { currentPage: 240, status: "completed" } } });
  });

  it("keeps stale, duplicate and history-failure paths typed", () => {
    expect(applyProgressFixture("progress-stale", input())).toMatchObject({ ok: false, error: { code: "conflict" } });

    const duplicateInput = input({ idempotencyKey: "00000000-0000-4000-8000-000000005344" });
    const first = applyProgressFixture("progress-duplicate", duplicateInput);
    const second = applyProgressFixture("progress-duplicate", duplicateInput);
    expect(first).toMatchObject({ ok: true, value: { duplicate: false } });
    expect(second).toMatchObject({ ok: true, value: { duplicate: true } });
    if (!first.ok || !second.ok) throw new Error("duplicate fixture should succeed");
    expect(second.value.history).toHaveLength(first.value.history.length);

    expect(applyProgressFixture("progress-server-error", input())).toMatchObject({ ok: false, error: { code: "history_unavailable" } });
  });
});
