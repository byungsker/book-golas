import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { generateBookReview } from "@/lib/product/adapters";
import { BookSchema, BookIdSchema } from "@/lib/product/contracts";
import { getBook, updateBook } from "@/lib/product/dal";
import { GET, POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/adapters", () => ({ generateBookReview: vi.fn() }));
vi.mock("@/lib/product/dal", () => ({ getBook: vi.fn(), updateBook: vi.fn() }));

const bookId = BookIdSchema.parse("00000000-0000-4000-8000-000000004331");
const idempotencyKey = "00000000-0000-4000-8000-000000000437";
const book = BookSchema.parse({
  id: bookId,
  title: "The Reading Atlas",
  author: "Mina Park",
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
  publisher: "Bookgolas Press",
  isbn: "9780306406157",
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: 18000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
});

function fixtureRequest(body: unknown, fixture = "review-share-happy") {
  return new NextRequest("http://localhost/api/consumer/review-share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "bookgolas-route-fixture=" + fixture,
    },
    body: JSON.stringify(body),
  });
}

function saveBody(overrides: Record<string, unknown> = {}) {
  return {
    action: "save",
    locale: "en",
    bookId,
    rating: 4,
    review: "A concise review.",
    longReview: "A longer reflection.",
    reviewLink: "https://bookgolas.example/reviews/431",
    idempotencyKey,
    ...overrides,
  };
}

describe("/api/consumer/review-share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
  });

  it("loads a private review and saves idempotently through the fixture", async () => {
    const loaded = await GET(new NextRequest(`http://localhost/api/consumer/review-share?bookId=${bookId}&locale=ko`, {
      headers: { Cookie: "bookgolas-route-fixture=review-share-happy" },
    }));
    expect(loaded.status).toBe(200);
    expect((await loaded.json()).canonicalUrl).toContain("/ko/books/");
    expect(loaded.headers.get("cache-control")).toBe("private, no-store");

    const first = await POST(fixtureRequest(saveBody()));
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.book.review).toBe("A concise review.");
    expect(firstBody.duplicate).toBe(false);

    const replay = await POST(fixtureRequest(saveBody()));
    expect((await replay.json()).duplicate).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith(`/en/books/${bookId}/review`);
  });

  it("keeps consent, provider and empty AI outcomes typed", async () => {
    const missingConsent = await POST(fixtureRequest({
      action: "generate",
      locale: "en",
      bookId,
      aiConsent: false,
      idempotencyKey,
    }, "review-share-happy"));
    expect(missingConsent.status).toBe(403);
    expect((await missingConsent.json()).error.code).toBe("consent_required");

    const provider = await POST(fixtureRequest({
      action: "generate",
      locale: "en",
      bookId,
      aiConsent: true,
      idempotencyKey,
    }, "review-share-provider"));
    expect(provider.status).toBe(502);
    expect((await provider.json()).error.code).toBe("provider_error");

    const empty = await POST(fixtureRequest({
      action: "generate",
      locale: "en",
      bookId,
      aiConsent: true,
      idempotencyKey,
    }, "review-share-empty"));
    expect(await empty.json()).toMatchObject({ kind: "draft", draft: "", memosUsed: 0 });
  });

  it("routes real saves and generation through owner-scoped product operations", async () => {
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
    vi.mocked(updateBook).mockResolvedValue({ ok: true, value: book });
    vi.mocked(generateBookReview).mockResolvedValue({ ok: true, value: { success: true, draft: "Generated", memosUsed: 2 } });

    const saved = await POST(fixtureRequest(saveBody(), "ignored"));
    expect(saved.status).toBe(200);
    expect(updateBook).toHaveBeenCalledWith(expect.objectContaining({ bookId, longReview: "A longer reflection." }));

    const generated = await POST(fixtureRequest({
      action: "generate",
      locale: "en",
      bookId,
      aiConsent: true,
      idempotencyKey,
    }, "ignored"));
    expect(generated.status).toBe(200);
    expect(await generated.json()).toMatchObject({ kind: "draft", draft: "Generated", memosUsed: 2 });
  });

  it("rejects caller ownership fields and foreign books without leaking data", async () => {
    const malformed = await POST(fixtureRequest({ ...saveBody(), user_id: "foreign-user" }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("validation_error");

    const foreign = await GET(new NextRequest(`http://localhost/api/consumer/review-share?bookId=${bookId}`, {
      headers: { Cookie: "bookgolas-route-fixture=review-share-foreign" },
    }));
    expect(foreign.status).toBe(404);
    expect(foreign.headers.get("cache-control")).toBe("private, no-store");
    expect(getBook).not.toHaveBeenCalled();
  });
});
