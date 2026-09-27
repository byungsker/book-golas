import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { recommendNextBooks, searchBooks } from "@/lib/product/adapters";
import type { RecommendationResult } from "@/lib/product/contracts";
import { POST } from "./route";

vi.mock("@/lib/product/adapters", () => ({
  recommendNextBooks: vi.fn(),
  searchBooks: vi.fn(),
}));

const book = {
  title: "Fixture Book",
  author: "Fixture Author",
  imageUrl: null,
  totalPages: 240,
  isbn: "9780306406157",
  genre: "essay",
  publisher: "Fixture Publisher",
  aladinUrl: null,
  price: 18000,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/consumer/book-discovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/consumer/book-discovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes text search through the server adapter", async () => {
    vi.mocked(searchBooks).mockResolvedValue({ ok: true, value: [book] });
    const response = await POST(request({ action: "search", locale: "ko", mode: "text", query: "  fixture  " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ kind: "search", books: [book] });
    expect(searchBooks).toHaveBeenCalledWith({ query: "fixture", locale: "ko", pagination: { limit: 10 } }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("normalizes a valid ISBN and rejects an invalid ISBN before the adapter", async () => {
    vi.mocked(searchBooks).mockResolvedValue({ ok: true, value: [book] });
    const valid = await POST(request({ action: "search", locale: "ko", mode: "isbn", query: "978-0-306-40615-7" }));
    expect(valid.status).toBe(200);
    expect(searchBooks).toHaveBeenCalledWith({ query: "9780306406157", locale: "ko", pagination: { limit: 10 } }, expect.anything());

    const invalid = await POST(request({ action: "search", locale: "ko", mode: "isbn", query: "9780306406156" }));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("validation_error");
    expect(searchBooks).toHaveBeenCalledTimes(1);
  });

  it("keeps recommendation entry on the verified server boundary", async () => {
    const recommendation = { success: true, recommendations: [], profile: { stats: { totalBooksCompleted: 0, averageRating: 0, favoriteGenres: [], averageCompletionDays: 0, highEngagementBookCount: 0 }, booksAnalyzed: 0 } } satisfies RecommendationResult;
    vi.mocked(recommendNextBooks).mockResolvedValue({ ok: true, value: recommendation });
    const response = await POST(request({ action: "recommendations", locale: "en" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ kind: "recommendations", result: recommendation });
    expect(recommendNextBooks).toHaveBeenCalledWith("en", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("rejects caller-selected ownership fields", async () => {
    const response = await POST(request({ action: "search", locale: "ko", mode: "text", query: "fixture", user_id: "foreign" }));
    expect(response.status).toBe(400);
    expect(searchBooks).not.toHaveBeenCalled();
  });
});
