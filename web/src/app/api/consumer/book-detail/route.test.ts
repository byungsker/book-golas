import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BookSchema } from "@/lib/product/contracts";
import { deleteBook, getBook, updateBook } from "@/lib/product/dal";
import { revalidatePath } from "next/cache";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/dal", () => ({
  deleteBook: vi.fn(),
  getBook: vi.fn(),
  updateBook: vi.fn(),
}));

const book = BookSchema.parse({
  id: "00000000-0000-4000-8000-000000004331",
  title: "A detail book",
  author: "Author",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  currentPage: 84,
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
  review: "Review",
  reviewLink: "https://example.com/review",
  aladinUrl: "https://example.com/store",
  longReview: null,
  price: 18000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

function request(body: unknown, revision = book.updatedAt) {
  return new NextRequest("http://localhost/api/consumer/book-detail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "If-Match": `"${revision}"`,
      "X-Bookgolas-Action-Key": `${book.id}:${typeof body === "object" && body !== null && "action" in body ? body.action : "pause"}:${revision}`,
    },
    body: JSON.stringify(body),
  });
}

const baseRequest = {
  action: "pause" as const,
  locale: "en" as const,
  bookId: book.id,
};

describe("/api/consumer/book-detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("updates an owned book and revalidates dependent private views", async () => {
    vi.mocked(getBook).mockResolvedValue({ ok: true, value: book });
    vi.mocked(updateBook).mockResolvedValue({
      ok: true,
      value: { ...book, status: "will_retry", pausedAt: "2026-09-16T00:00:00.000Z" },
    });

    const response = await POST(request(baseRequest));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: "updated",
      action: "pause",
      book: { status: "will_retry" },
      invalidatedPaths: [
        "/en/home",
        "/en/library",
        `/en/books/${book.id}`,
        `/en/reading/${book.id}`,
        `/en/books/${book.id}/review`,
        `/en/books/${book.id}/mind-map`,
      ],
    });
    expect(updateBook).toHaveBeenCalledWith({
      bookId: book.id,
      status: "will_retry",
      pausedAt: expect.any(String),
    }, undefined, book.updatedAt);
    expect(revalidatePath).toHaveBeenCalledWith(`/en/books/${book.id}/mind-map`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("soft-deletes only after a valid delete action reaches the owner-scoped DAL", async () => {
    vi.mocked(getBook).mockResolvedValue({ ok: true, value: book });
    vi.mocked(deleteBook).mockResolvedValue({ ok: true, value: { deleted: true } });

    const response = await POST(request({ ...baseRequest, action: "delete" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: "deleted", action: "delete", book: null });
    expect(deleteBook).toHaveBeenCalledWith(book.id, undefined, book.updatedAt);
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("soft-deletes two identical requests only once", async () => {
    vi.mocked(getBook).mockResolvedValueOnce({ ok: true, value: book }).mockResolvedValueOnce({ ok: true, value: { ...book, deletedAt: "2026-09-16T00:00:00.000Z" } });
    vi.mocked(deleteBook).mockResolvedValue({ ok: true, value: { deleted: true } });
    const payload = { ...baseRequest, action: "delete" as const };

    expect((await POST(request(payload))).status).toBe(200);
    const replay = await POST(request(payload));
    expect(replay.status).toBe(409);
    expect(deleteBook).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed caller identity before reading or writing private data", async () => {
    const response = await POST(request({ ...baseRequest, user_id: "foreign-user" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("validation_error");
    expect(getBook).not.toHaveBeenCalled();
    expect(updateBook).not.toHaveBeenCalled();
    expect(deleteBook).not.toHaveBeenCalled();
  });

  it("returns typed not-found and validation errors for inaccessible or invalid transitions", async () => {
    vi.mocked(getBook).mockResolvedValueOnce({
      ok: false,
      error: { code: "not_found", status: 404, message: "Book not found.", retryable: false },
    });
    const missing = await POST(request(baseRequest));
    expect(missing.status).toBe(404);

    vi.mocked(getBook).mockResolvedValueOnce({ ok: true, value: book });
    const invalidTransition = await POST(request({ ...baseRequest, action: "resume" }));
    expect(invalidTransition.status).toBe(400);
    expect((await invalidTransition.json()).error.code).toBe("validation_error");
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("fails closed for missing, malformed, and stale revisions", async () => {
    const missing = request(baseRequest);
    missing.headers.delete("if-match");
    const missingResponse = await POST(missing);
    expect(missingResponse.status).toBe(428);
    expect(await missingResponse.json()).toEqual({ error: { code: "precondition_required", status: 428, message: "If-Match is required.", retryable: false } });

    const malformed = request(baseRequest);
    malformed.headers.set("if-match", book.updatedAt ?? "");
    const malformedResponse = await POST(malformed);
    expect(malformedResponse.status).toBe(400);
    expect(await malformedResponse.json()).toMatchObject({ error: { code: "validation_error", status: 400, message: "If-Match must be a quoted revision." } });

    vi.mocked(getBook).mockResolvedValue({ ok: true, value: book });
    const staleRevision = "2026-08-01T00:00:00.000Z";
    const stale = await POST(request(baseRequest, staleRevision));
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toMatchObject({ code: "conflict", status: 409 });
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("rejects a quoted non-ISO revision before reading or mutating the book", async () => {
    const nonIsoRevision = "September 1, 2026";
    vi.mocked(getBook).mockResolvedValue({
      ok: true,
      value: { ...book, updatedAt: nonIsoRevision },
    });
    vi.mocked(updateBook).mockResolvedValue({
      ok: true,
      value: { ...book, status: "will_retry" },
    });

    const response = await POST(request(baseRequest, nonIsoRevision));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "validation_error",
        status: 400,
        message: "If-Match must be a quoted revision.",
        retryable: false,
      },
    });
    expect(getBook).not.toHaveBeenCalled();
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("rejects a quoted ISO-shaped revision that does not round-trip", async () => {
    const response = await POST(request(baseRequest, "2026-02-30T00:00:00.000Z"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "validation_error",
        status: 400,
        message: "If-Match must be a quoted revision.",
        retryable: false,
      },
    });
    expect(getBook).not.toHaveBeenCalled();
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("applies two identical requests only once", async () => {
    const updated = { ...book, status: "will_retry" as const, updatedAt: "2026-09-16T00:00:00.000Z" };
    vi.mocked(getBook).mockResolvedValueOnce({ ok: true, value: book }).mockResolvedValueOnce({ ok: true, value: updated });
    vi.mocked(updateBook).mockResolvedValue({ ok: true, value: updated });

    expect((await POST(request(baseRequest))).status).toBe(200);
    const replay = await POST(request(baseRequest));
    expect(replay.status).toBe(409);
    expect((await replay.json()).error.code).toBe("conflict");
    expect(updateBook).toHaveBeenCalledTimes(1);
  });
});
