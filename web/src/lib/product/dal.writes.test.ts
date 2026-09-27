import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookIdSchema } from "@/lib/product/contracts";
import { createBook, deleteBook, updateBook } from "./dal";

vi.mock("server-only", () => ({}));

type QueryResponse = {
  data: unknown;
  error: { code?: string; message?: string; status?: number } | null;
};

const userId = "10000000-0000-4000-8000-000000000001";
const bookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");

function makeBookRow(overrides: Record<string, unknown> = {}) {
  return {
    id: bookId,
    title: "Created book",
    author: "Author",
    start_date: "2026-08-01T00:00:00.000Z",
    target_date: "2026-08-31T00:00:00.000Z",
    image_url: null,
    current_page: 0,
    total_pages: 100,
    status: "planned",
    attempt_count: 1,
    daily_target_pages: null,
    priority: null,
    paused_at: null,
    planned_start_date: null,
    deleted_at: null,
    genre: null,
    publisher: null,
    isbn: null,
    rating: null,
    review: null,
    review_link: null,
    aladin_url: null,
    long_review: null,
    price: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeQuery(response: QueryResponse) {
  const query = {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    select: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  return query;
}

function makeSupabase(query: ReturnType<typeof makeQuery>) {
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

function makeConcurrentDeleteSupabase() {
  const revision = "2026-08-01T00:00:00.000Z";
  const storagePath = `${userId}/${bookId}/page.png`;
  let deleted = false;
  const storageList = vi.fn().mockResolvedValue({
    data: [{ id: "object-id", name: "page.png" }],
    error: null,
  });
  const storageRemove = vi.fn().mockResolvedValue({ data: [], error: null });
  const imageRowDelete = vi.fn();
  const from = vi.fn((table: string) => {
    let operation: "select" | "update" | "delete" = "select";
    let expectedRevision: string | undefined;
    const response = () => {
      if (table === "books") {
        if (operation === "update") {
          if (deleted || expectedRevision !== revision) {
            return Promise.resolve({ data: null, error: null });
          }
          deleted = true;
          return Promise.resolve({ data: { id: bookId }, error: null });
        }
        return Promise.resolve({
          data: deleted ? null : { id: bookId, total_pages: 100 },
          error: null,
        });
      }
      if (operation === "delete") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: [{ storage_path: storagePath }], error: null });
    };
    const query = {
      select: vi.fn(() => query),
      update: vi.fn(() => {
        operation = "update";
        return query;
      }),
      delete: vi.fn(() => {
        operation = "delete";
        imageRowDelete();
        return query;
      }),
      eq: vi.fn((column: string, value: string) => {
        if (column === "updated_at") expectedRevision = value;
        return query;
      }),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(() => response()),
      then: (resolve: (value: QueryResponse) => unknown, reject?: (reason: unknown) => unknown) => response().then(resolve, reject),
    };
    return query;
  });
  return {
    revision,
    imageRowDelete,
    storageList,
    storageRemove,
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
      from,
      storage: {
        from: vi.fn(() => ({ list: storageList, remove: storageRemove })),
      },
    },
  };
}

const createRequest = {
  title: "Created book",
  author: "Author",
  startDate: "2026-08-01T00:00:00.000Z",
  targetDate: "2026-08-31T00:00:00.000Z",
  totalPages: 100,
  status: "planned" as const,
  imageUrl: null,
  genre: null,
  publisher: null,
  isbn: null,
  aladinUrl: null,
  price: null,
  dailyTargetPages: null,
  priority: null,
};

describe("user-scoped product DAL writes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a book with the verified session owner", async () => {
    const query = makeQuery({ data: makeBookRow(), error: null });
    const supabase = makeSupabase(query);

    const result = await createBook(
      createRequest,
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true, value: { id: bookId } });
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, deleted_at: null }),
    );
    expect(query.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "20000000-0000-4000-8000-000000000002" }),
    );
  });

  it("normalizes lifecycle dates and persists the planned start separately", async () => {
    const query = makeQuery({ data: makeBookRow(), error: null });
    const supabase = makeSupabase(query);

    const result = await createBook(
      {
        ...createRequest,
        startDate: "2026-08-01T09:00:00+09:00",
        targetDate: "2026-08-31T09:00:00+09:00",
        plannedStartDate: "2026-08-02T09:00:00+09:00",
        priority: 4,
      },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true });
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      start_date: "2026-08-01T00:00:00.000Z",
      target_date: "2026-08-31T00:00:00.000Z",
      planned_start_date: "2026-08-02T00:00:00.000Z",
      priority: 4,
    }));
  });

  it("updates only an active book owned by the verified session", async () => {
    const query = makeQuery({ data: makeBookRow(), error: null });
    const supabase = makeSupabase(query);

    const result = await updateBook(
      { bookId, title: "Updated book" },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true });
    expect(query.update).toHaveBeenCalledWith({ title: "Updated book" });
    expect(query.eq).toHaveBeenCalledWith("id", bookId);
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("rejects a non-canonical status transition before writing", async () => {
    const query = makeQuery({ data: makeBookRow(), error: null });
    const supabase = makeSupabase(query);

    const result = await updateBook(
      { bookId, status: "completed" },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: false, error: { code: "validation_error" } });
    expect(query.update).not.toHaveBeenCalled();
  });

  it("clears a planned date when a planned book starts reading", async () => {
    const query = makeQuery({ data: makeBookRow({ planned_start_date: "2026-08-02T00:00:00.000Z" }), error: null });
    const supabase = makeSupabase(query);

    const result = await updateBook(
      { bookId, status: "reading" },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true });
    expect(query.update).toHaveBeenCalledWith({ status: "reading", planned_start_date: null });
  });

  it("soft-deletes an owned book through the same scoped update", async () => {
    const query = makeQuery({ data: { id: bookId }, error: null });
    const supabase = makeSupabase(query);

    const result = await deleteBook(
      bookId,
      () => Promise.resolve(supabase as never),
    );

    expect(result).toEqual({ ok: true, value: { deleted: true } });
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("lets only the compare-and-set winner clean dependent image rows and storage", async () => {
    const setup = makeConcurrentDeleteSupabase();
    const factory = () => Promise.resolve(setup.supabase as never);

    const results = await Promise.all([
      deleteBook(bookId, factory, setup.revision),
      deleteBook(bookId, factory, setup.revision),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      expect.objectContaining({ error: expect.objectContaining({ code: "conflict", status: 409 }) }),
    ]);
    expect(setup.storageList).toHaveBeenCalledTimes(1);
    expect(setup.storageRemove).toHaveBeenCalledTimes(1);
    expect(setup.imageRowDelete).toHaveBeenCalledTimes(1);
  });
});
