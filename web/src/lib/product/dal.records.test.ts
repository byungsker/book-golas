import { describe, expect, it, vi } from "vitest";
import { BookIdSchema, RecordIdSchema } from "@/lib/product/contracts";
import { listOwnedReadingRecords } from "./dal";
import { encodeReadingRecordCursor } from "./dal/record-cursor";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const bookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");
const recordId = RecordIdSchema.parse("50000000-0000-4000-8000-000000000005");
const createdAt = "2026-09-16T00:00:00.000Z";

function makeQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return query;
}

function makeSupabase(query: ReturnType<typeof makeQuery>) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: vi.fn().mockReturnValue(query),
  };
}

describe("owner-scoped reading record DAL", () => {
  it("returns typed records with an opaque stable cursor", async () => {
    const query = makeQuery([
        {
          id: recordId,
          book_id: bookId,
          content_type: "highlight",
          content_text: "A saved thought.",
          page_number: 12,
          source_id: recordId,
          created_at: createdAt,
          books: { title: "Typed book", image_url: null },
        },
        {
          id: "60000000-0000-4000-8000-000000000006",
          book_id: bookId,
          content_type: "note",
          content_text: "Another thought.",
          page_number: 18,
          source_id: null,
          created_at: "2026-09-15T00:00:00.000Z",
          books: { title: "Typed book", image_url: null },
        },
    ]);
    const supabase = makeSupabase(query);
    const result = await listOwnedReadingRecords(
      { pagination: { limit: 1 }, contentType: "highlight" },
      () => Promise.resolve(supabase as never),
    );

    expect(result).toMatchObject({ ok: true, value: { records: [{ bookTitle: "Typed book", contentType: "highlight" }], pageInfo: { hasMore: true } } });
    expect(supabase.from).toHaveBeenCalledWith("reading_content_embeddings");
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.eq).toHaveBeenCalledWith("content_type", "highlight");
    if (result.ok) expect(result.value.pageInfo.nextCursor).toBeTruthy();
  });

  it("applies the record cursor and fails closed without a session", async () => {
    const cursor = encodeReadingRecordCursor({ version: 1, value: createdAt, id: recordId, bookId });
    const query = makeQuery([]);
    const supabase = makeSupabase(query);
    const result = await listOwnedReadingRecords(
      { pagination: { limit: 10, cursor } },
      () => Promise.resolve(supabase as never),
    );
    expect(result).toMatchObject({ ok: true });
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining("created_at.lt."));

    const from = vi.fn();
    const anonymous = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) }, from };
    const denied = await listOwnedReadingRecords({ pagination: { limit: 10 } }, () => Promise.resolve(anonymous as never));
    expect(denied).toMatchObject({ ok: false, error: { code: "unauthorized", status: 401 } });
    expect(from).not.toHaveBeenCalled();
  });
});
