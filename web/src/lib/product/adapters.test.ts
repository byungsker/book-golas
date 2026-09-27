import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  generateBookReview,
  generateReadingInsights,
  invokeProductFunction,
  normalizeRecallResponse,
  recommendNextBooks,
  searchAladinBooks,
  searchGoogleBooks,
  searchRecall,
} from "./adapters";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const bookId = "30000000-0000-4000-8000-000000000003";
const sourceId = "50000000-0000-4000-8000-000000000005";
const insightId = "60000000-0000-4000-8000-000000000006";
const generatedAt = "2026-09-14T00:00:00.000Z";

type Query = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
};

function makeQuery(data: unknown = [], error: unknown = null): Query {
  const query = {} as Query;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  query.then = (resolve) => Promise.resolve({ data, error }).then(resolve);
  return query;
}

function makeSupabase(options: {
  functionData?: unknown;
  functionError?: unknown;
  accessToken?: string | null;
  user?: { id: string } | null;
  userError?: unknown;
  books?: unknown[];
} = {}) {
  const query = makeQuery(options.books ?? []);
  const invoke = vi.fn().mockResolvedValue({
    data: options.functionData ?? null,
    error: options.functionError ?? null,
  });
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user === undefined ? { id: userId } : options.user },
        error: options.userError ?? null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: options.accessToken === null ? null : { access_token: options.accessToken ?? "session-token" } },
        error: null,
      }),
    },
    functions: { invoke },
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn(),
  };
  return { supabase, invoke, query };
}

function factoryFor(supabase: unknown) {
  return () => Promise.resolve(supabase as never);
}

const aladinPayload = {
  books: [
    {
      title: "Typed book",
      author: "Typed author",
      cover: "https://images.example.invalid/book.jpg",
      isbn: "9780000000000",
      publisher: "Bookgolas Press",
      genre: "essay",
      link: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=1",
      totalPages: 240,
      price: 18000,
    },
  ],
};

describe("product function adapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards the verified browser session token to the expected function", async () => {
    const { supabase, invoke } = makeSupabase({ functionData: aladinPayload, accessToken: "browser-session-token" });

    const result = await searchAladinBooks(
      { query: "typed book", locale: "ko", pagination: { limit: 10 } },
      { factory: factoryFor(supabase) },
    );

    expect(result).toMatchObject({ ok: true, value: [{ title: "Typed book", author: "Typed author" }] });
    expect(invoke).toHaveBeenCalledWith(
      "aladin-books",
      expect.objectContaining({
        body: { query: "typed book" },
        headers: {
          Authorization: "Bearer browser-session-token",
          "X-Client-Info": "bookgolas-web",
        },
        timeout: 15_000,
      }),
    );
  });

  it("rejects a missing or expired session before invoking a function", async () => {
    const missing = makeSupabase({ user: null });
    const missingResult = await generateBookReview(bookId, { factory: factoryFor(missing.supabase) });
    expect(missingResult).toMatchObject({ ok: false, error: { code: "unauthorized", status: 401 } });
    expect(missing.invoke).not.toHaveBeenCalled();

    const expired = makeSupabase({ accessToken: null });
    const expiredResult = await generateBookReview(bookId, { factory: factoryFor(expired.supabase) });
    expect(expiredResult).toMatchObject({ ok: false, error: { code: "unauthorized", status: 401 } });
    expect(expired.invoke).not.toHaveBeenCalled();

    const expiredAuth = makeSupabase({ userError: new Error("JWT expired") });
    const expiredAuthResult = await generateBookReview(bookId, { factory: factoryFor(expiredAuth.supabase) });
    expect(expiredAuthResult).toMatchObject({ ok: false, error: { code: "unauthorized", status: 401 } });
    expect(expiredAuth.invoke).not.toHaveBeenCalled();
  });

  it.each([
    ["consent_required", 403, "consent_required"],
    ["quota_exceeded", 429, "quota_exceeded"],
    ["timeout", 504, "timeout"],
    ["provider_error", 502, "provider_error"],
    ["configuration", 503, "configuration_error"],
  ] as const)("preserves the %s policy/provider error code and status", async (rawCode, status, expectedCode) => {
    const functionError = rawCode === "configuration"
      ? { code: "unavailable", status, message: "Service configuration is unavailable" }
      : { code: rawCode, status, message: `${rawCode} message` };
    const { supabase } = makeSupabase({ functionError });
    const result = await generateBookReview(bookId, { factory: factoryFor(supabase) });
    expect(result).toMatchObject({ ok: false, error: { code: expectedCode, status } });
  });

  it("maps transport failures to offline and validates successful responses", async () => {
    const { supabase } = makeSupabase();
    supabase.functions.invoke.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const offline = await invokeProductFunction(
      "test-function",
      {},
      z.object({ ok: z.literal(true) }),
      { factory: factoryFor(supabase) },
    );
    expect(offline).toMatchObject({ ok: false, error: { code: "offline", status: 503 } });

    supabase.functions.invoke.mockResolvedValueOnce({ data: { unexpected: true }, error: null });
    const malformed = await invokeProductFunction(
      "test-function",
      {},
      z.object({ ok: z.literal(true) }),
      { factory: factoryFor(supabase) },
    );
    expect(malformed).toMatchObject({ ok: false, error: { code: "unavailable", status: 503 } });
  });

  it("normalizes Aladin and server-side Google Books records into BookSearchResult", async () => {
    const aladin = makeSupabase({ functionData: { books: [{ ...aladinPayload.books[0], author: "" }] } });
    const aladinResult = await searchAladinBooks(
      { query: "book", locale: "ko", pagination: { limit: 10 } },
      { factory: factoryFor(aladin.supabase) },
    );
    expect(aladinResult).toMatchObject({ ok: true, value: [{ author: "Unknown author", price: 18000 }] });

    const googleResult = await searchGoogleBooks(
      { query: "google book", locale: "en", pagination: { limit: 10 } },
      vi.fn().mockResolvedValue(new Response(JSON.stringify({
        items: [{
          selfLink: "https://books.google.com/books?id=1",
          volumeInfo: {
            title: "Google book",
            authors: ["Google author"],
            publisher: "Google Press",
            pageCount: 120,
            imageLinks: { thumbnail: "https://images.example.invalid/google.jpg" },
            industryIdentifiers: [{ type: "ISBN_13", identifier: "9780000000001" }],
            categories: ["Technology"],
          },
        }],
      }), { headers: { "Content-Type": "application/json" } })),
    );
    expect(googleResult).toMatchObject({ ok: true, value: [{ title: "Google book", isbn: "9780000000001", totalPages: 120 }] });
  });

  it("preserves a Google Books network failure as offline", async () => {
    const googleResult = await searchGoogleBooks(
      { query: "offline book", locale: "en", pagination: { limit: 10 } },
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    expect(googleResult).toMatchObject({ ok: false, error: { code: "offline", status: 503 } });
  });

  it("normalizes title-keyed recall groups into Todo 2 book-id groups", () => {
    const result = normalizeRecallResponse({
      answer: "Answer",
      sources: [{
        type: "note",
        content: "A note",
        pageNumber: 3,
        sourceId,
        createdAt: generatedAt,
        bookId,
        bookTitle: "Book title",
      }],
      sourcesByBook: {
        "Book title": [{
          type: "note",
          content: "A note",
          pageNumber: 3,
          sourceId,
          createdAt: generatedAt,
          bookId,
          bookTitle: "Book title",
        }],
      },
    });
    expect(result).toMatchObject({ ok: true, value: { sourcesByBook: { [bookId]: [{ content: "A note" }] } } });
  });

  it("maps insight titles to verified owned book ids", async () => {
    const { supabase } = makeSupabase({
      functionData: {
        success: true,
        insights: [{
          id: insightId,
          title: "Reading pattern",
          description: "You read consistently.",
          category: "pattern",
          relatedBooks: ["Typed book"],
          generatedAt,
        }],
      },
      books: [{ id: bookId, title: "Typed book" }],
    });
    const result = await generateReadingInsights({ factory: factoryFor(supabase) });
    expect(result).toMatchObject({ ok: true, value: [{ relatedBooks: [bookId] }] });
    expect(supabase.from).toHaveBeenCalledWith("books");
  });

  it("does not pass a caller-selected identity to recommendation or recall functions", async () => {
    const recommendation = makeSupabase({ functionData: {
      success: true,
      recommendations: [],
      profile: { stats: { totalBooksCompleted: 0, averageRating: 0, favoriteGenres: [], averageCompletionDays: 0, highEngagementBookCount: 0 }, booksAnalyzed: 0 },
    } });
    await recommendNextBooks("en", { factory: factoryFor(recommendation.supabase) });
    expect(recommendation.invoke).toHaveBeenCalledWith(
      "recommend-next-books",
      expect.objectContaining({ body: { userId, locale: "en" } }),
    );

    const recall = makeSupabase({ functionData: { answer: "none", sources: [] } });
    await searchRecall({ query: "query", locale: "ko" }, { factory: factoryFor(recall.supabase) });
    expect(recall.invoke).toHaveBeenCalledWith(
      "recall-search",
      expect.objectContaining({ body: { query: "query", locale: "ko" } }),
    );
  });
});
