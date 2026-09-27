import "server-only";

import {
  ConsumerRecordSchema,
  NotesHighlightsMutationSchema,
  normalizeHighlightRectangles,
  type ConsumerRecord,
  type NotesHighlightsMutation,
} from "@/lib/product/contracts";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveProductSession, type ProductClientFactory, type ProductSession } from "./context";
import {
  failure,
  mapDatabaseError,
  notFoundError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "./errors";

const recordColumns = "id,book_id,record_type,page_number,content_text,caption,image_url,rectangles,source_id,source_href,index_status,index_error,last_index_idempotency_key,created_at,updated_at";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRecord(value: unknown): ProductResult<ConsumerRecord> {
  if (!isRecord(value)) return failure(unavailableError("Saved reading record is malformed."));
  const parsed = ConsumerRecordSchema.safeParse({
    id: value.id,
    bookId: value.book_id,
    recordType: value.record_type,
    pageNumber: value.page_number ?? null,
    contentText: value.content_text,
    caption: value.caption ?? null,
    imageUrl: value.image_url ?? null,
    rectangles: value.rectangles ?? [],
    sourceId: value.source_id ?? null,
    sourceHref: value.source_href ?? null,
    indexStatus: value.index_status,
    indexError: value.index_error ?? null,
    createdAt: value.created_at,
    updatedAt: value.updated_at ?? value.created_at,
  });
  return parsed.success
    ? success(parsed.data)
    : failure(unavailableError("Saved reading record is invalid."));
}

async function ownedBook(
  session: ProductSession,
  bookId: string,
): Promise<ProductResult<{ totalPages: number }>> {
  const { data, error } = await session.supabase
    .from("books")
    .select("id,total_pages")
    .eq("id", bookId)
    .eq("user_id", session.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!isRecord(data) || typeof data.total_pages !== "number") return failure(notFoundError());
  return success({ totalPages: data.total_pages });
}

function validatePage(input: NotesHighlightsMutation, totalPages: number): ProductResult<true> {
  if (input.pageNumber !== undefined && input.pageNumber !== null && input.pageNumber > totalPages) {
    return failure(validationError("The page number is outside the book."));
  }
  return success(true);
}

function indexText(record: ConsumerRecord): string {
  return [record.contentText.trim(), record.caption?.trim() ?? ""].filter(Boolean).join("\n").trim();
}

async function runIndex(
  session: ProductSession,
  record: ConsumerRecord,
): Promise<ProductResult<true>> {
  const contentText = indexText(record);
  if (!contentText) return success(true);
  try {
    const response = await session.supabase.functions.invoke("generate-embedding", {
      body: {
        // This value comes from the verified session, never from the request body.
        userId: session.userId,
        bookId: record.bookId,
        contentType: record.recordType === "memorable_page" ? "photo_ocr" : record.recordType,
        contentText,
        ...(record.pageNumber === null ? {} : { pageNumber: record.pageNumber }),
        sourceId: record.id,
      },
    });
    if (response.error) {
      return failure(unavailableError("The indexing service is unavailable."));
    }
    return success(true);
  } catch {
    return failure(unavailableError("The indexing service is unavailable."));
  }
}

async function setIndexStatus(
  session: ProductSession,
  recordId: string,
  status: ConsumerRecord["indexStatus"],
  indexError: string | null,
  lastIndexIdempotencyKey?: string,
): Promise<ProductResult<ConsumerRecord>> {
  const updates = {
    index_status: status,
    index_error: indexError,
    ...(lastIndexIdempotencyKey ? { last_index_idempotency_key: lastIndexIdempotencyKey } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await session.supabase
    .from("consumer_reading_records")
    .update(updates)
    .eq("id", recordId)
    .eq("user_id", session.userId)
    .select(recordColumns)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  return parseRecord(data);
}

async function finishIndexing(
  session: ProductSession,
  record: ConsumerRecord,
  aiConsent: boolean,
): Promise<ConsumerRecord> {
  if (!aiConsent) return ConsumerRecordSchema.parse({ ...record, indexStatus: "skipped", indexError: null });
  const indexed = await runIndex(session, record);
  const status = indexed.ok ? "ready" : "failed";
  const indexError = indexed.ok ? null : indexed.error.message;
  const updated = await setIndexStatus(session, record.id, status, indexError);
  return updated.ok
    ? updated.value
    : ConsumerRecordSchema.parse({ ...record, indexStatus: status, indexError });
}

export async function listOwnedConsumerRecords(
  bookId: string,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<ConsumerRecord[]>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, bookId);
  if (!book.ok) return failure(book.error);

  try {
    const { data, error } = await session.value.supabase
      .from("consumer_reading_records")
      .select(recordColumns)
      .eq("user_id", session.value.userId)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    if (error) return failure(mapDatabaseError(error));
    const records: ConsumerRecord[] = [];
    for (const row of Array.isArray(data) ? data : []) {
      const parsed = parseRecord(row);
      if (!parsed.ok) return failure(parsed.error);
      records.push(parsed.value);
    }
    return success(records);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function createOwnedConsumerRecord(
  input: NotesHighlightsMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ record: ConsumerRecord; duplicate: boolean }>> {
  const parsedInput = NotesHighlightsMutationSchema.safeParse(input);
  if (!parsedInput.success || parsedInput.data.action !== "create" || !parsedInput.data.recordType) return failure(validationError());
  const data = parsedInput.data;
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, data.bookId);
  if (!book.ok) return failure(book.error);
  const page = validatePage(data, book.value.totalPages);
  if (!page.ok) return failure(page.error);

  const existing = await session.value.supabase
    .from("consumer_reading_records")
    .select(recordColumns)
    .eq("user_id", session.value.userId)
    .eq("book_id", data.bookId)
    .eq("idempotency_key", data.idempotencyKey)
    .maybeSingle();
  if (existing.error) return failure(mapDatabaseError(existing.error));
  if (existing.data) {
    const parsed = parseRecord(existing.data);
    return parsed.ok ? success({ record: parsed.value, duplicate: true }) : failure(parsed.error);
  }

  const indexStatus = data.aiConsent ? "pending" : "skipped";
  const { data: created, error } = await session.value.supabase
    .from("consumer_reading_records")
    .insert({
      user_id: session.value.userId,
      book_id: data.bookId,
      record_type: data.recordType,
      page_number: data.pageNumber ?? null,
      content_text: data.contentText,
      caption: data.caption ?? null,
      image_url: data.imageUrl ?? null,
      rectangles: normalizeHighlightRectangles(data.rectangles),
      source_id: data.sourceId ?? null,
      source_href: data.sourceHref ?? null,
      index_status: indexStatus,
      index_error: null,
      idempotency_key: data.idempotencyKey,
    })
    .select(recordColumns)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  const parsed = parseRecord(created);
  if (!parsed.ok) return failure(parsed.error);
  return success({ record: await finishIndexing(session.value, parsed.value, data.aiConsent), duplicate: false });
}

export async function updateOwnedConsumerRecord(
  input: NotesHighlightsMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ record: ConsumerRecord; duplicate: boolean }>> {
  const parsedInput = NotesHighlightsMutationSchema.safeParse(input);
  if (!parsedInput.success || parsedInput.data.action !== "update" || !parsedInput.data.recordId || !parsedInput.data.recordType) return failure(validationError());
  const data = parsedInput.data;
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, data.bookId);
  if (!book.ok) return failure(book.error);
  const page = validatePage(data, book.value.totalPages);
  if (!page.ok) return failure(page.error);

  const current = await session.value.supabase
    .from("consumer_reading_records")
    .select(recordColumns)
    .eq("id", data.recordId)
    .eq("user_id", session.value.userId)
    .eq("book_id", data.bookId)
    .maybeSingle();
  if (current.error) return failure(mapDatabaseError(current.error));
  if (!current.data) return failure(notFoundError());
  const currentRecord = parseRecord(current.data);
  if (!currentRecord.ok) return failure(currentRecord.error);

  const { data: updated, error } = await session.value.supabase
    .from("consumer_reading_records")
    .update({
      record_type: data.recordType,
      page_number: data.pageNumber ?? null,
      content_text: data.contentText,
      caption: data.caption ?? null,
      image_url: data.imageUrl ?? null,
      rectangles: normalizeHighlightRectangles(data.rectangles),
      source_id: data.sourceId ?? null,
      source_href: data.sourceHref ?? null,
      index_status: data.aiConsent ? "pending" : "skipped",
      index_error: null,
      idempotency_key: data.idempotencyKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentRecord.value.id)
    .eq("user_id", session.value.userId)
    .eq("book_id", data.bookId)
    .select(recordColumns)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  const parsed = parseRecord(updated);
  if (!parsed.ok) return failure(parsed.error);
  return success({ record: await finishIndexing(session.value, parsed.value, data.aiConsent), duplicate: false });
}

export async function deleteOwnedConsumerRecord(
  input: NotesHighlightsMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ recordId: string }>> {
  const parsedInput = NotesHighlightsMutationSchema.safeParse(input);
  if (!parsedInput.success || parsedInput.data.action !== "delete" || !parsedInput.data.recordId) return failure(validationError());
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsedInput.data.bookId);
  if (!book.ok) return failure(book.error);
  const { data, error } = await session.value.supabase
    .from("consumer_reading_records")
    .delete()
    .eq("id", parsedInput.data.recordId)
    .eq("user_id", session.value.userId)
    .eq("book_id", parsedInput.data.bookId)
    .select("id")
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!isRecord(data) || typeof data.id !== "string") return failure(notFoundError());
  return success({ recordId: data.id });
}

export async function retryOwnedConsumerRecordIndex(
  input: NotesHighlightsMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ record: ConsumerRecord; duplicate: boolean }>> {
  const parsedInput = NotesHighlightsMutationSchema.safeParse(input);
  if (!parsedInput.success || parsedInput.data.action !== "retry" || !parsedInput.data.recordId) return failure(validationError());
  if (!parsedInput.data.aiConsent) return failure(validationError("AI indexing consent is required before retrying."));
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsedInput.data.bookId);
  if (!book.ok) return failure(book.error);
  const current = await session.value.supabase
    .from("consumer_reading_records")
    .select(recordColumns)
    .eq("id", parsedInput.data.recordId)
    .eq("user_id", session.value.userId)
    .eq("book_id", parsedInput.data.bookId)
    .maybeSingle();
  if (current.error) return failure(mapDatabaseError(current.error));
  if (!current.data) return failure(notFoundError());
  const record = parseRecord(current.data);
  if (!record.ok) return failure(record.error);
  if (record.value.indexStatus === "ready") return success({ record: record.value, duplicate: true });
  if (isRecord(current.data) && current.data.last_index_idempotency_key === parsedInput.data.idempotencyKey) {
    return success({ record: record.value, duplicate: true });
  }

  const pending = await setIndexStatus(session.value, record.value.id, "pending", null, parsedInput.data.idempotencyKey);
  if (!pending.ok) return failure(pending.error);
  const indexed = await runIndex(session.value, pending.value);
  const status = indexed.ok ? "ready" : "failed";
  const indexError = indexed.ok ? null : indexed.error.message;
  const final = await setIndexStatus(session.value, pending.value.id, status, indexError);
  return final.ok
    ? success({ record: final.value, duplicate: false })
    : success({ record: ConsumerRecordSchema.parse({ ...pending.value, indexStatus: status, indexError }), duplicate: false });
}
