import { describe, expect, it } from "vitest";
import {
  getBookProgress,
  isValidReadingPage,
  parseConsumerBook,
} from "@/entities/book";

describe("book entity", () => {
  it("normalizes owned book rows and rejects impossible progress", () => {
    const book = parseConsumerBook({
      id: "7b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
      title: "Book",
      author: "Author",
      start_date: "2026-08-01T00:00:00.000Z",
      target_date: "2026-08-31T00:00:00.000Z",
      current_page: 100,
      total_pages: 100,
      status: "reading",
    });

    expect(book).not.toBeNull();
    expect(getBookProgress(book!)).toBe(100);
    expect(
      parseConsumerBook({
        id: "7b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
        title: "Book",
        start_date: "2026-08-01T00:00:00.000Z",
        target_date: "2026-08-31T00:00:00.000Z",
        current_page: 101,
        total_pages: 100,
        status: "reading",
      }),
    ).toBeNull();
    expect(parseConsumerBook({ id: "missing-title" })).toBeNull();
    expect(isValidReadingPage(100, 100)).toBe(true);
    expect(isValidReadingPage(101, 100)).toBe(false);
    expect(isValidReadingPage(-1, 100)).toBe(false);
  });
});
