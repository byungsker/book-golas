import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BookSchema } from "@/lib/product/contracts";
import { createBook, listBooks } from "@/lib/product/dal";
import { GET, POST } from "./route";

vi.mock("@/lib/product/dal", () => ({
  createBook: vi.fn(),
  listBooks: vi.fn(),
}));

const book = BookSchema.parse({
  id: "30000000-0000-4000-8000-000000000003",
  title: "A typed book",
  author: "A typed author",
  startDate: "2026-08-01T00:00:00.000Z",
  targetDate: "2026-08-31T00:00:00.000Z",
  imageUrl: null,
  currentPage: 0,
  totalPages: 100,
  status: "planned",
  attemptCount: 1,
  dailyTargetPages: null,
  priority: null,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: null,
  publisher: null,
  isbn: null,
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest("http://localhost" + url, init);
}

describe("/api/app/books", () => {
  beforeEach(() => vi.clearAllMocks());

  it("translates list query parameters into the shared request contract", async () => {
    vi.mocked(listBooks).mockResolvedValue({
      ok: true,
      value: {
        books: [book],
        pageInfo: { nextCursor: null, hasMore: false },
      },
    });

    const response = await GET(
      request("/api/app/books?limit=2&sort=title&direction=asc&status=reading"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      books: [book],
      pageInfo: { nextCursor: null, hasMore: false },
    });
    expect(listBooks).toHaveBeenCalledWith({
      pagination: { limit: 2 },
      sort: { field: "title", direction: "asc" },
      status: "reading",
    });
  });

  it("rejects malformed query parameters before the DAL", async () => {
    const response = await GET(request("/api/app/books?limit=0&sort=created"));

    expect(response.status).toBe(400);
    expect(listBooks).not.toHaveBeenCalled();
    expect((await response.json()).error.code).toBe("validation_error");
  });

  it("rejects caller-selected ownership fields", async () => {
    const response = await POST(
      request("/api/app/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "10000000-0000-4000-8000-000000000001",
          title: "Should be rejected",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createBook).not.toHaveBeenCalled();
    expect((await response.json()).error.code).toBe("validation_error");
  });

  it("maps an unauthenticated DAL result to the consumer error contract", async () => {
    vi.mocked(listBooks).mockResolvedValue({
      ok: false,
      error: {
        code: "unauthorized",
        status: 401,
        message: "Sign-in required.",
        retryable: false,
      },
    });

    const response = await GET(request("/api/app/books"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "unauthorized",
        status: 401,
        message: "Sign-in required.",
        retryable: false,
      },
    });
  });
});
