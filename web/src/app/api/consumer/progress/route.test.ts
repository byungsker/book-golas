import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import { fetchOwnedProgressHistory } from "@/lib/consumer/queries";
import { BookIdSchema, BookSchema, RecordIdSchema } from "@/lib/product/contracts";
import { revalidatePath } from "next/cache";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/actions/reading-progress", () => ({ updateReadingProgress: vi.fn() }));
vi.mock("@/lib/consumer/queries", () => ({ fetchOwnedProgressHistory: vi.fn() }));

const bookId = BookIdSchema.parse("00000000-0000-4000-8000-000000004341");
const requestId = RecordIdSchema.parse("00000000-0000-4000-8000-000000005345");
const book = BookSchema.parse({
  id: bookId,
  title: "The Reading Atlas",
  author: "Mina Park",
  startDate: "2026-09-01T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  currentPage: 100,
  totalPages: 240,
  status: "reading",
  attemptCount: 1,
  dailyTargetPages: 18,
  priority: 2,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Bookgolas Press",
  isbn: "9780306406157",
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: 18000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-16T00:05:00.000Z",
});

const payload = {
  locale: "en" as const,
  bookId,
  currentPage: 100,
  expectedCurrentPage: 84,
  idempotencyKey: requestId,
  readingTime: 900,
};

function request(body: unknown, fixture?: string) {
  return new NextRequest("http://localhost/api/consumer/progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(fixture ? { Cookie: `bookgolas-route-fixture=${fixture}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/consumer/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
  });

  it("returns one atomic book and history response for the owner", async () => {
    vi.mocked(updateReadingProgress).mockResolvedValue({ ok: true, book, historyRecorded: true });
    vi.mocked(fetchOwnedProgressHistory).mockResolvedValue({
      history: [{ id: requestId, bookId, page: 100, previousPage: 84, readingTime: 900, createdAt: book.updatedAt ?? "2026-09-16T00:05:00.000Z" }],
      code: "ok",
      authenticated: true,
    });

    const response = await POST(request(payload));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: "updated",
      book,
      historyRecorded: true,
      duplicate: false,
      history: [{ page: 100, previousPage: 84 }],
    });
    expect(updateReadingProgress).toHaveBeenCalledWith(payload);
    expect(fetchOwnedProgressHistory).toHaveBeenCalledWith(bookId);
    expect(revalidatePath).toHaveBeenCalledWith(`/en/books/${bookId}`);
  });

  it("rejects caller ownership fields before the atomic action", async () => {
    const response = await POST(request({ ...payload, user_id: "foreign-user" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("validation_error");
    expect(updateReadingProgress).not.toHaveBeenCalled();
  });

  it("does not present success when history cannot be read after a write", async () => {
    vi.mocked(updateReadingProgress).mockResolvedValue({ ok: true, book, historyRecorded: true });
    vi.mocked(fetchOwnedProgressHistory).mockResolvedValue({ history: [], code: "unavailable", authenticated: true });

    const response = await POST(request(payload));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("history_unavailable");
  });

  it("keeps stale writes on the conflict path", async () => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    const response = await POST(request(payload, "progress-stale"));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("conflict");
    expect(updateReadingProgress).not.toHaveBeenCalled();
  });

  it("replays a duplicate fixture without adding another history event", async () => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    const first = await POST(request(payload, "progress-duplicate"));
    const second = await POST(request(payload, "progress-duplicate"));
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstBody.duplicate).toBe(false);
    expect(secondBody.duplicate).toBe(true);
    expect(secondBody.history).toHaveLength(firstBody.history.length);
  });

  it("turns a history failure into a typed error", async () => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    const response = await POST(request(payload, "progress-server-error"));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("history_unavailable");
  });
});
