import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { BookIdSchema, ConsumerRecordSchema } from "@/lib/product/contracts";
import {
  createOwnedConsumerRecord,
  deleteOwnedConsumerRecord,
  listOwnedConsumerRecords,
  retryOwnedConsumerRecordIndex,
  updateOwnedConsumerRecord,
} from "@/lib/product/dal";
import { POST, GET } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/dal", () => ({
  createOwnedConsumerRecord: vi.fn(),
  deleteOwnedConsumerRecord: vi.fn(),
  listOwnedConsumerRecords: vi.fn(),
  retryOwnedConsumerRecordIndex: vi.fn(),
  updateOwnedConsumerRecord: vi.fn(),
}));

const bookId = BookIdSchema.parse("00000000-0000-4000-8000-000000004332");
const recordId = "00000000-0000-4000-8000-000000004321";
const idempotencyKey = "00000000-0000-4000-8000-000000000921";
const record = ConsumerRecordSchema.parse({
  id: recordId,
  bookId,
  recordType: "note" as const,
  pageNumber: 18,
  contentText: "A saved note.",
  caption: null,
  imageUrl: null,
  rectangles: [],
  sourceId: null,
  sourceHref: null,
  indexStatus: "skipped" as const,
  indexError: null,
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
});

function request(body: unknown) {
  return new NextRequest("http://localhost/api/consumer/notes-highlights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function input(action: "create" | "update" | "delete" | "retry") {
  return {
    action,
    locale: "en" as const,
    bookId,
    ...(action !== "create" ? { recordId } : {}),
    ...(action === "create" || action === "update" ? { recordType: "note" as const, pageNumber: 18, contentText: "A saved note.", rectangles: [] } : {}),
    ...(action === "retry" ? { aiConsent: true } : {}),
    idempotencyKey,
  };
}

describe("/api/consumer/notes-highlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
  });

  it("lists and saves a record, then invalidates private book views", async () => {
    vi.mocked(listOwnedConsumerRecords).mockResolvedValue({ ok: true, value: [record] });
    const list = await GET(new NextRequest(`http://localhost/api/consumer/notes-highlights?bookId=${bookId}`));
    expect(list.status).toBe(200);
    expect(await list.json()).toMatchObject({ kind: "list", records: [{ id: recordId }] });

    vi.mocked(createOwnedConsumerRecord).mockResolvedValue({ ok: true, value: { record, duplicate: false } });
    const saved = await POST(request(input("create")));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ kind: "saved", record: { id: recordId }, duplicate: false });
    expect(revalidatePath).toHaveBeenCalledWith(`/en/books/${bookId}`);
  });

  it("routes update, retry and delete through their typed owner operations", async () => {
    vi.mocked(updateOwnedConsumerRecord).mockResolvedValue({ ok: true, value: { record, duplicate: false } });
    vi.mocked(retryOwnedConsumerRecordIndex).mockResolvedValue({ ok: true, value: { record: { ...record, indexStatus: "ready" }, duplicate: false } });
    vi.mocked(deleteOwnedConsumerRecord).mockResolvedValue({ ok: true, value: { recordId } });

    expect((await POST(request(input("update")))).status).toBe(200);
    expect((await POST(request(input("retry")))).status).toBe(200);
    expect((await POST(request(input("delete")))).status).toBe(200);
    expect(updateOwnedConsumerRecord).toHaveBeenCalledOnce();
    expect(retryOwnedConsumerRecordIndex).toHaveBeenCalledOnce();
    expect(deleteOwnedConsumerRecord).toHaveBeenCalledOnce();
  });

  it("rejects foreign identity and keeps typed failure responses private", async () => {
    const malformed = await POST(request({ ...input("create"), user_id: "foreign-user" }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("validation_error");
    expect(createOwnedConsumerRecord).not.toHaveBeenCalled();

    vi.mocked(listOwnedConsumerRecords).mockResolvedValue({ ok: false, error: { code: "not_found", status: 404, message: "Book not found.", retryable: false } });
    const missing = await GET(new NextRequest(`http://localhost/api/consumer/notes-highlights?bookId=${bookId}`));
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("private, no-store");
  });

  it("replays create and retry keys without duplicating an owned record", async () => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    const createBody = {
      ...input("create"),
      bookId: "00000000-0000-4000-8000-000000004398",
      idempotencyKey: "00000000-0000-4000-8000-000000000922",
      recordType: "note" as const,
      contentText: "One durable record.",
    };
    const first = await POST(new NextRequest("http://localhost/api/consumer/notes-highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "bookgolas-route-fixture=notes-highlights-happy" },
      body: JSON.stringify(createBody),
    }));
    const firstBody = await first.json();
    const second = await POST(new NextRequest("http://localhost/api/consumer/notes-highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "bookgolas-route-fixture=notes-highlights-happy" },
      body: JSON.stringify(createBody),
    }));
    const secondBody = await second.json();
    expect(firstBody.record.id).toBe(secondBody.record.id);
    expect(secondBody.duplicate).toBe(true);

    const failedCreate = await POST(new NextRequest("http://localhost/api/consumer/notes-highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "bookgolas-route-fixture=notes-highlights-index-failure" },
      body: JSON.stringify({ ...createBody, idempotencyKey: "00000000-0000-4000-8000-000000000923", aiConsent: true }),
    }));
    const failedBody = await failedCreate.json();
    const retryBody = {
      action: "retry",
      locale: "en",
      bookId: createBody.bookId,
      recordId: failedBody.record.id,
      aiConsent: true,
      idempotencyKey: "00000000-0000-4000-8000-000000000924",
    };
    const retry = await POST(new NextRequest("http://localhost/api/consumer/notes-highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "bookgolas-route-fixture=notes-highlights-index-failure" },
      body: JSON.stringify(retryBody),
    }));
    const replay = await POST(new NextRequest("http://localhost/api/consumer/notes-highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "bookgolas-route-fixture=notes-highlights-index-failure" },
      body: JSON.stringify(retryBody),
    }));
    expect((await retry.json()).record.id).toBe(failedBody.record.id);
    expect((await replay.json()).duplicate).toBe(true);
  });
});
