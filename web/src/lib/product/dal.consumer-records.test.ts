import { describe, expect, it, vi } from "vitest";
import { BookIdSchema } from "@/lib/product/contracts";
import {
  createOwnedConsumerRecord,
  listOwnedConsumerRecords,
} from "./dal";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const bookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");
const recordId = "50000000-0000-4000-8000-000000000005";
const idempotencyKey = "60000000-0000-4000-8000-000000000006";
const createdAt = "2026-09-16T00:00:00.000Z";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: recordId,
    book_id: bookId,
    record_type: "highlight",
    page_number: 12,
    content_text: "A saved thought.",
    caption: null,
    image_url: null,
    rectangles: [{ x: 0.123457, y: 0.2, width: 0.4, height: 0.1 }],
    source_id: recordId,
    source_href: null,
    index_status: "pending",
    index_error: null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function makeQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return query;
}

function makeFactory(options: { existing?: unknown; created?: unknown; updated?: unknown; book?: unknown; indexError?: boolean } = {}) {
  const bookQuery = makeQuery({ data: options.book === undefined ? { id: bookId, total_pages: 240 } : options.book, error: null });
  const existingQuery = makeQuery({ data: options.existing ?? null, error: null });
  const createQuery = makeQuery({ data: options.created ?? row(), error: null });
  const updateQuery = makeQuery({ data: options.updated ?? row({ index_status: "ready" }), error: null });
  const from = vi.fn()
    .mockReturnValueOnce(bookQuery)
    .mockReturnValueOnce(existingQuery)
    .mockReturnValueOnce(createQuery)
    .mockReturnValue(updateQuery);
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from,
    functions: { invoke: options.indexError ? vi.fn().mockRejectedValue(new Error("index unavailable")) : vi.fn().mockResolvedValue({ status: 200 }) },
  };
  return { factory: () => Promise.resolve(supabase as never), supabase, bookQuery, existingQuery, createQuery, updateQuery };
}

function createInput(aiConsent = true) {
  return {
    action: "create" as const,
    locale: "en" as const,
    bookId,
    recordType: "highlight" as const,
    pageNumber: 12,
    contentText: "A saved thought.",
    rectangles: [{ x: 0.1234567, y: 0.2, width: 0.4, height: 0.1 }],
    aiConsent,
    idempotencyKey,
  };
}

describe("owner-scoped consumer reading records", () => {
  it("saves the owner record before indexing and normalizes coordinates", async () => {
    const setup = makeFactory();
    const result = await createOwnedConsumerRecord(createInput(), setup.factory);

    expect(result).toMatchObject({ ok: true, value: { record: { indexStatus: "ready", rectangles: [{ x: 0.123457 }] }, duplicate: false } });
    expect(setup.supabase.functions.invoke).toHaveBeenCalledOnce();
    expect(setup.supabase.from).toHaveBeenCalledWith("consumer_reading_records");
    expect(setup.createQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, index_status: "pending" }));
    expect(setup.createQuery.insert.mock.invocationCallOrder[0]).toBeLessThan(setup.supabase.functions.invoke.mock.invocationCallOrder[0]);
  });

  it("keeps a saved record when the optional index fails", async () => {
    const setup = makeFactory({ indexError: true, updated: row({ index_status: "failed", index_error: "The indexing service is unavailable." }) });
    const result = await createOwnedConsumerRecord(createInput(), setup.factory);

    expect(result).toMatchObject({ ok: true, value: { record: { id: recordId, indexStatus: "failed" } } });
    expect(setup.createQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, book_id: bookId }));
    expect(setup.updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({ index_status: "failed" }));
  });

  it("skips AI indexing without consent and hides foreign books", async () => {
    const withoutConsent = makeFactory();
    const saved = await createOwnedConsumerRecord(createInput(false), withoutConsent.factory);
    expect(saved).toMatchObject({ ok: true, value: { record: { indexStatus: "skipped" } } });
    expect(withoutConsent.supabase.functions.invoke).not.toHaveBeenCalled();

    const foreign = makeFactory({ book: null });
    const denied = await listOwnedConsumerRecords(bookId, foreign.factory);
    expect(denied).toMatchObject({ ok: false, error: { code: "not_found", status: 404 } });
    expect(foreign.supabase.from).toHaveBeenCalledWith("books");
    expect(foreign.supabase.from).not.toHaveBeenCalledWith("consumer_reading_records");
    expect(foreign.bookQuery.eq).toHaveBeenCalledWith("user_id", userId);
  });
});
