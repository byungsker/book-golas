import { describe, expect, it } from "vitest";
import { getHomeBookListFixtureBooks } from "./home-book-list-fixtures";
import {
  getDaysUntilTarget,
  getEffectiveBookStatus,
  getHomeBookListStatus,
  getHomeBookListView,
  selectHomeBookListBooks,
} from "./home-book-list";
import type { ConsumerBook } from "./types";

function book(overrides: Partial<ConsumerBook> = {}): ConsumerBook {
  return {
    id: "00000000-0000-4000-8000-000000004201",
    title: "Book",
    author: "Author",
    startDate: "2026-09-01T00:00:00.000Z",
    targetDate: "2026-09-24T00:00:00.000Z",
    plannedStartDate: null,
    imageUrl: null,
    currentPage: 10,
    totalPages: 100,
    status: "reading",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    pausedAt: null,
    ...overrides,
  };
}

describe("home book-list status surface", () => {
  it("keeps native views and maps paused to will_retry", () => {
    expect(getHomeBookListView("unknown")).toBe("reading");
    expect(getHomeBookListStatus("paused")).toBe("will_retry");
    expect(getHomeBookListStatus("all")).toBeNull();
  });

  it("treats a fully read book as completed like the native list", () => {
    expect(getEffectiveBookStatus(book({ currentPage: 100 }))).toBe("completed");
    expect(selectHomeBookListBooks([book({ currentPage: 100 })], "completed")).toHaveLength(1);
    expect(selectHomeBookListBooks([book({ currentPage: 100 })], "reading")).toHaveLength(0);
  });

  it("groups all statuses and keeps tie ordering stable", () => {
    const reading = book({ id: "00000000-0000-4000-8000-000000004202", updatedAt: null });
    const planned = book({ id: "00000000-0000-4000-8000-000000004203", status: "planned", plannedStartDate: "2026-09-20T00:00:00.000Z" });
    const completed = book({ id: "00000000-0000-4000-8000-000000004204", status: "completed" });
    const paused = book({ id: "00000000-0000-4000-8000-000000004205", status: "will_retry", pausedAt: "2026-09-10T00:00:00.000Z" });
    expect(selectHomeBookListBooks([paused, completed, planned, reading], "all").map((item) => item.id)).toEqual([
      reading.id,
      planned.id,
      completed.id,
      paused.id,
    ]);
  });

  it("sorts planned and paused rows by their native date signals", () => {
    const latePlan = book({ id: "00000000-0000-4000-8000-000000004207", status: "planned", plannedStartDate: "2026-10-01T00:00:00.000Z" });
    const earlyPlan = book({ id: "00000000-0000-4000-8000-000000004206", status: "planned", plannedStartDate: "2026-09-20T00:00:00.000Z" });
    expect(selectHomeBookListBooks([latePlan, earlyPlan], "planned").map((item) => item.id)).toEqual([earlyPlan.id, latePlan.id]);

    const oldPause = book({ id: "00000000-0000-4000-8000-000000004208", status: "will_retry", pausedAt: "2026-09-01T00:00:00.000Z" });
    const recentPause = book({ id: "00000000-0000-4000-8000-000000004209", status: "will_retry", pausedAt: "2026-09-10T00:00:00.000Z" });
    expect(selectHomeBookListBooks([oldPause, recentPause], "paused").map((item) => item.id)).toEqual([recentPause.id, oldPause.id]);
  });

  it("calculates target D-day deterministically", () => {
    const now = new Date("2026-09-16T12:00:00.000Z");
    expect(getDaysUntilTarget("2026-09-20T00:00:00.000Z", now)).toBe(4);
    expect(getDaysUntilTarget("2026-09-16T00:00:00.000Z", now)).toBe(0);
    expect(getDaysUntilTarget("2026-09-10T00:00:00.000Z", now)).toBe(-6);
    expect(getDaysUntilTarget("not-a-date", now)).toBeNull();
  });

  it("keeps seeded rows loopback-only and removes the deleted row before rendering", () => {
    const fixtureBooks = getHomeBookListFixtureBooks();
    expect(fixtureBooks).toHaveLength(4);
    expect(fixtureBooks.map((item) => item.status)).toEqual([
      "reading",
      "completed",
      "planned",
      "will_retry",
    ]);
    expect(fixtureBooks.some((item) => item.title.includes("Deleted"))).toBe(false);
  });
});
