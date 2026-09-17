import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BookSchema } from "@/lib/product/contracts";
import { createBook, updateBook } from "@/lib/product/dal";
import { revalidatePath } from "next/cache";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/dal", () => ({ createBook: vi.fn(), updateBook: vi.fn() }));

const book = BookSchema.parse({
  id: "30000000-0000-4000-8000-000000000003",
  title: "A lifecycle book",
  author: "Author",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-15T00:00:00.000Z",
  imageUrl: null,
  currentPage: 0,
  totalPages: 240,
  status: "reading",
  attemptCount: 1,
  dailyTargetPages: 18,
  priority: 2,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Publisher",
  isbn: "9780306406157",
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: 18000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

function request(body: unknown) {
  return new NextRequest("http://localhost/api/consumer/book-lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const createPayload = {
  action: "create" as const,
  locale: "en" as const,
  book: {
    title: "A lifecycle book",
    author: "Author",
    startDate: "2026-09-01T00:00:00.000Z",
    targetDate: "2026-09-15T00:00:00.000Z",
    plannedStartDate: null,
    totalPages: 240,
    status: "reading" as const,
    imageUrl: null,
    genre: "essay",
    publisher: "Publisher",
    isbn: "9780306406157",
    aladinUrl: null,
    price: 18000,
    dailyTargetPages: 18,
    priority: 2,
  },
};

describe("/api/consumer/book-lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the authenticated DAL and returns cache invalidation paths", async () => {
    vi.mocked(createBook).mockResolvedValue({ ok: true, value: book });

    const response = await POST(request(createPayload));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      kind: "saved",
      action: "create",
      book,
      invalidatedPaths: ["/en/home", "/en/library", `/en/books/${book.id}`, `/en/reading/${book.id}`],
    });
    expect(createBook).toHaveBeenCalledWith(createPayload.book);
    expect(revalidatePath).toHaveBeenCalledWith("/en/home");
    expect(revalidatePath).toHaveBeenCalledWith(`/en/books/${book.id}`);
  });

  it("forces the route action and rejects caller ownership fields", async () => {
    const response = await POST(request({ ...createPayload, book: { ...createPayload.book, user_id: "10000000-0000-4000-8000-000000000001" } }));

    expect(response.status).toBe(400);
    expect(createBook).not.toHaveBeenCalled();
  });

  it("returns an inaccessible update as a private not-found response", async () => {
    vi.mocked(updateBook).mockResolvedValue({
      ok: false,
      error: { code: "not_found", status: 404, message: "Book not found.", retryable: false },
    });

    const response = await POST(request({
      action: "update",
      locale: "ko",
      book: { bookId: book.id, status: "reading" },
    }));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
