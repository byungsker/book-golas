import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BookSchema } from "@/shared/api/contracts";
import { createBook, getBook, updateBook } from "@/entities/book/index.server";
import { revalidatePath } from "next/cache";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/entities/book/index.server", () => ({ createBook: vi.fn(), getBook: vi.fn(), updateBook: vi.fn() }));

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

function request(body: unknown, options: { readonly revision?: string | null; readonly actionKey?: string | null } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const bodyBookId = typeof body === "object" && body !== null && "book" in body && typeof body.book === "object" && body.book !== null && "bookId" in body.book ? body.book.bookId : null;
  const defaultActionKey = options.revision && typeof bodyBookId === "string"
    ? `${bodyBookId}:update:${options.revision}`
    : "11111111-1111-4111-8111-111111111111";
  if (options.actionKey !== null) headers.set("X-Bookgolas-Action-Key", options.actionKey ?? defaultActionKey);
  if (options.revision !== null && options.revision !== undefined) headers.set("If-Match", `"${options.revision}"`);
  return new NextRequest("http://localhost/api/consumer/book-lifecycle", {
    method: "POST",
    headers,
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
    vi.mocked(getBook).mockResolvedValue({ ok: false, error: { code: "not_found", status: 404, message: "Book not found.", retryable: false } });
    vi.mocked(createBook).mockResolvedValue({ ok: true, value: book });

    const response = await POST(request(createPayload));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      kind: "saved",
      action: "create",
      book,
      invalidatedPaths: ["/en/home", "/en/library", `/en/books/${book.id}`, `/en/reading/${book.id}`],
    });
    expect(createBook).toHaveBeenCalledWith(createPayload.book, undefined, "11111111-1111-4111-8111-111111111111");
    expect(revalidatePath).toHaveBeenCalledWith("/en/home");
    expect(revalidatePath).toHaveBeenCalledWith(`/en/books/${book.id}`);
  });

  it("forces the route action and rejects caller ownership fields", async () => {
    const response = await POST(request({ ...createPayload, book: { ...createPayload.book, user_id: "10000000-0000-4000-8000-000000000001" } }));

    expect(response.status).toBe(400);
    expect(createBook).not.toHaveBeenCalled();
  });

  it("persists a repeated create action key only once", async () => {
    vi.mocked(getBook).mockResolvedValueOnce({ ok: false, error: { code: "not_found", status: 404, message: "Book not found.", retryable: false } }).mockResolvedValueOnce({ ok: true, value: book });
    vi.mocked(createBook).mockResolvedValue({ ok: true, value: book });

    expect((await POST(request(createPayload))).status).toBe(201);
    const replay = await POST(request(createPayload));
    expect(replay.status).toBe(409);
    expect((await replay.json()).error).toMatchObject({ code: "conflict", status: 409 });
    expect(createBook).toHaveBeenCalledTimes(1);
  });

  it("returns an inaccessible update as a private not-found response", async () => {
    vi.mocked(updateBook).mockResolvedValue({
      ok: false,
      error: { code: "not_found", status: 404, message: "Book not found.", retryable: false },
    });

    vi.mocked(getBook).mockResolvedValue({ ok: false, error: { code: "not_found", status: 404, message: "Book not found.", retryable: false } });
    const response = await POST(request({
      action: "update",
      locale: "ko",
      book: { bookId: book.id, status: "reading" },
    }, { revision: book.updatedAt }));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fails closed for missing, malformed, and stale update revisions", async () => {
    const payload = { action: "update" as const, locale: "en" as const, book: { bookId: book.id, priority: 1 } };
    const missing = await POST(request(payload));
    expect(missing.status).toBe(428);
    expect(await missing.json()).toEqual({ error: { code: "precondition_required", status: 428, message: "If-Match is required.", retryable: false } });

    const malformed = request(payload, { revision: book.updatedAt });
    malformed.headers.set("if-match", book.updatedAt ?? "");
    const malformedResponse = await POST(malformed);
    expect(malformedResponse.status).toBe(400);
    expect(await malformedResponse.json()).toMatchObject({ error: { code: "validation_error", status: 400, message: "If-Match must be a quoted revision." } });

    vi.mocked(getBook).mockResolvedValue({ ok: true, value: book });
    const stale = await POST(request(payload, { revision: "2026-08-01T00:00:00.000Z" }));
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toMatchObject({ code: "conflict", status: 409 });
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("applies two identical updates only once", async () => {
    const payload = { action: "update" as const, locale: "en" as const, book: { bookId: book.id, priority: 1 } };
    const updated = { ...book, priority: 1, updatedAt: "2026-09-16T00:00:00.000Z" };
    vi.mocked(getBook).mockResolvedValueOnce({ ok: true, value: book }).mockResolvedValueOnce({ ok: true, value: updated });
    vi.mocked(updateBook).mockResolvedValue({ ok: true, value: updated });

    expect((await POST(request(payload, { revision: book.updatedAt }))).status).toBe(200);
    const replay = await POST(request(payload, { revision: book.updatedAt }));
    expect(replay.status).toBe(409);
    expect(updateBook).toHaveBeenCalledTimes(1);
  });
});
