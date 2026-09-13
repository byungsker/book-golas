import { beforeEach, describe, expect, it, vi } from "vitest";
import userBBookFixture from "./fixtures/user-b-book.json";
import { BookIdSchema } from "@/lib/product/contracts";
import {
  bookDtoSelect,
  decodeBookCursor,
  encodeBookCursor,
  getBook,
  listBooks,
} from "./dal";

vi.mock("server-only", () => ({}));

const cursorBookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");

type QueryResponse = {
  data: unknown;
  error: { code?: string; message?: string; status?: number } | null;
};

function makeBookRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "30000000-0000-4000-8000-000000000003",
    title: "A typed book",
    author: "A typed author",
    start_date: "2026-08-01T00:00:00.000Z",
    target_date: "2026-08-31T00:00:00.000Z",
    image_url: null,
    current_page: 10,
    total_pages: 100,
    status: "reading",
    attempt_count: 1,
    daily_target_pages: 5,
    priority: 2,
    paused_at: null,
    planned_start_date: null,
    deleted_at: null,
    genre: "essay",
    publisher: "Bookgolas Press",
    isbn: "9780000000000",
    rating: 4,
    review: null,
    review_link: null,
    aladin_url: null,
    long_review: null,
    price: 18000,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeQuery(response: QueryResponse) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: (resolve: (value: QueryResponse) => unknown) =>
      Promise.resolve(response).then(resolve),
  };
  return query;
}

function makeSupabase(
  query: ReturnType<typeof makeQuery>,
  userId = "20000000-0000-4000-8000-000000000002",
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue(query),
  };
}

describe("user-scoped product DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns typed DTOs with ownership, soft-delete and deterministic pagination filters", async () => {
    const query = makeQuery({
      data: [makeBookRow(), makeBookRow({ id: "40000000-0000-4000-8000-000000000004" })],
      error: null,
    });
    const supabase = makeSupabase(query);

    const result = await listBooks(
      {
        pagination: { limit: 1 },
        sort: { field: "updated_at", direction: "desc" },
      },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        books: [{ id: "30000000-0000-4000-8000-000000000003", currentPage: 10 }],
        pageInfo: { hasMore: true },
      },
    });
    expect(supabase.from).toHaveBeenCalledWith("books");
    expect(query.select).toHaveBeenCalledWith(bookDtoSelect);
    expect(query.eq).toHaveBeenCalledWith("user_id", "20000000-0000-4000-8000-000000000002");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.order).toHaveBeenNthCalledWith(1, "updated_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(2);
  });

  it("applies a cursor only when its sort contract matches the request", async () => {
    const cursor = encodeBookCursor({
      version: 1,
      field: "updated_at",
      direction: "desc",
      value: "2026-08-02T00:00:00.000Z",
      id: cursorBookId,
    });
    const query = makeQuery({ data: [], error: null });
    const supabase = makeSupabase(query);

    const result = await listBooks(
      {
        pagination: { cursor, limit: 25 },
        sort: { field: "updated_at", direction: "desc" },
      },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true });
    expect(query.or).toHaveBeenCalledWith(
      'updated_at.lt."2026-08-02T00:00:00.000Z",and(updated_at.eq."2026-08-02T00:00:00.000Z",id.lt.30000000-0000-4000-8000-000000000003),updated_at.is.null',
    );
  });

  it("keeps null sort values in the tail after a non-null cursor", async () => {
    const cursor = encodeBookCursor({
      version: 1,
      field: "created_at",
      direction: "asc",
      value: "2026-08-02T00:00:00.000Z",
      id: cursorBookId,
    });
    const query = makeQuery({ data: [], error: null });
    const supabase = makeSupabase(query);

    const result = await listBooks(
      {
        pagination: { cursor, limit: 25 },
        sort: { field: "created_at", direction: "asc" },
      },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true });
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining("created_at.is.null"));
  });

  it("rejects a cursor that belongs to a different sort contract", async () => {
    const cursor = encodeBookCursor({
      version: 1,
      field: "title",
      direction: "asc",
      value: "A typed book",
      id: cursorBookId,
    });
    const query = makeQuery({ data: [], error: null });
    const supabase = makeSupabase(query);

    const result = await listBooks(
      {
        pagination: { cursor, limit: 25 },
        sort: { field: "updated_at", direction: "desc" },
      },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "validation_error", status: 400 },
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails closed when the session is missing", async () => {
    const from = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from,
    };

    const result = await listBooks(
      {
        pagination: { limit: 25 },
        sort: { field: "updated_at", direction: "desc" },
      },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "unauthorized", status: 401 },
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns not_found for malformed identifiers before querying book data", async () => {
    const from = vi.fn();
    const result = await getBook(
      "not-a-book-id",
      () =>
        Promise.resolve({
          auth: { getUser: vi.fn() },
          from,
        } as never),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "not_found", status: 404 },
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("keeps a user-b-book fixture outside the authenticated user's result", async () => {
    const query = makeQuery({ data: null, error: null });
    const supabase = makeSupabase(query, userBBookFixture.userB.id);

    const result = await getBook(
      userBBookFixture.book.id,
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "not_found", status: 404 },
    });
    expect(query.eq).toHaveBeenCalledWith("id", userBBookFixture.book.id);
    expect(query.eq).toHaveBeenCalledWith("user_id", userBBookFixture.userB.id);
    expect(query.eq).not.toHaveBeenCalledWith("user_id", userBBookFixture.book.ownerId);
  });

  it("round-trips the opaque cursor contract", () => {
    const input = {
      version: 1 as const,
      field: "current_page" as const,
      direction: "asc" as const,
      value: 10,
      id: cursorBookId,
    };

    const decoded = decodeBookCursor(encodeBookCursor(input));

    expect(decoded).toEqual({ ok: true, value: input });
  });
});
