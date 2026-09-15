import { describe, expect, it } from "vitest";
import { getCalendarFixture } from "./calendar-fixtures";

describe("calendar fixtures", () => {
  it("covers activity, sessions and planned, paused and completed book states", () => {
    const result = getCalendarFixture({ fixture: "calendar-happy", year: 2026, month: 9, filter: "all" });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("calendar happy fixture should succeed");

    const books = result.value.days.flatMap((day) => day.books);
    expect(books.map((book) => book.status)).toEqual(expect.arrayContaining(["reading", "completed", "will_retry", "planned"]));
    expect(result.value.days.find((day) => day.day === "2026-09-02")?.pagesRead).toBe(12);
    expect(result.value.days.find((day) => day.day === "2026-09-06")?.durationSeconds).toBe(1_800);
    expect(result.value.days.find((day) => day.day === "2026-09-20")?.books[0].kind).toBe("planned");
  });

  it("filters completed books without changing the stable source events", () => {
    const all = getCalendarFixture({ fixture: "calendar-happy", year: 2026, month: 9, filter: "all" });
    const completed = getCalendarFixture({ fixture: "calendar-happy", year: 2026, month: 9, filter: "completed" });
    expect(all.ok && completed.ok).toBe(true);
    if (!all.ok || !completed.ok) throw new Error("calendar fixtures should succeed");
    const completedBooks = completed.value.days.flatMap((day) => day.books);
    expect(completedBooks.every((book) => book.status === "completed")).toBe(true);
    expect(completedBooks.some((book) => book.title === "Finished Signals")).toBe(true);
    expect(all.value.days.flatMap((day) => day.books).some((book) => book.status === "will_retry")).toBe(true);
  });

  it("drops foreign events before they become day detail rows", () => {
    const result = getCalendarFixture({ fixture: "calendar-foreign", year: 2026, month: 9, filter: "all" });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("calendar foreign fixture should be readable");
    const books = result.value.days.flatMap((day) => day.books);
    expect(books.every((book) => book.bookId !== "00000000-0000-4000-8000-000000004398")).toBe(true);
  });

  it("keeps typed failure fixtures distinct", () => {
    expect(getCalendarFixture({ fixture: "calendar-unauthorized", year: 2026, month: 9, filter: "all" })).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(getCalendarFixture({ fixture: "calendar-offline", year: 2026, month: 9, filter: "all" })).toMatchObject({ ok: false, error: { code: "offline" } });
    expect(getCalendarFixture({ fixture: "calendar-empty", year: 2026, month: 9, filter: "all" })).toMatchObject({ ok: true, value: { days: [] } });
  });
});
