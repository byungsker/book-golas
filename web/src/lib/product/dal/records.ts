import "server-only";

import {
  LibraryRecordTypeSchema,
  PaginationSchema,
  PageInfoSchema,
  ReadingRecordSchema,
  type LibraryRecordType,
  type ReadingRecord,
} from "@/lib/product/contracts";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveProductSession, type ProductClientFactory } from "./context";
import { decodeReadingRecordCursor, encodeReadingRecordCursor } from "./record-cursor";
import {
  failure,
  mapDatabaseError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "./errors";

export type ReadingRecordListRequest = Readonly<{
  pagination: { cursor?: string; limit?: number };
  contentType?: LibraryRecordType;
}>;

export type ReadingRecordListData = Readonly<{
  records: ReadingRecord[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
}>;

function filterValue(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export async function listOwnedReadingRecords(
  request: ReadingRecordListRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<ReadingRecordListData>> {
  const pagination = PaginationSchema.safeParse(request.pagination);
  const contentType = request.contentType === undefined
    ? undefined
    : LibraryRecordTypeSchema.safeParse(request.contentType);
  if (!pagination.success || (contentType !== undefined && !contentType.success)) {
    return failure(validationError());
  }

  let cursor;
  if (pagination.data.cursor !== undefined) {
    const parsedCursor = decodeReadingRecordCursor(pagination.data.cursor);
    if (!parsedCursor.ok) return failure(parsedCursor.error);
    cursor = parsedCursor.value;
  }

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  try {
    let query = session.value.supabase
      .from("reading_content_embeddings")
      .select("id,book_id,content_type,content_text,page_number,source_id,created_at,books(title,image_url)")
      .eq("user_id", session.value.userId);

    if (contentType !== undefined && contentType.success) {
      query = query.eq("content_type", contentType.data);
    }
    if (cursor) {
      query = query.or(
        `created_at.lt.${filterValue(cursor.value)},and(created_at.eq.${filterValue(cursor.value)},id.lt.${cursor.id})`,
      );
    }

    query = query
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(pagination.data.limit + 1);

    const { data, error } = await query;
    if (error) return failure(mapDatabaseError(error));
    const rows: unknown[] = Array.isArray(data) ? data : [];
    const hasMore = rows.length > pagination.data.limit;
    const visibleRows = rows.slice(0, pagination.data.limit);
    const records: ReadingRecord[] = [];

    for (const rawRow of visibleRows) {
      if (typeof rawRow !== "object" || rawRow === null) return failure(unavailableError("Reading record data is malformed."));
      const row = rawRow as Record<string, unknown>;
      const book = typeof row.books === "object" && row.books !== null && !Array.isArray(row.books)
        ? row.books as Record<string, unknown>
        : null;
      const parsed = ReadingRecordSchema.safeParse({
        id: row.id,
        bookId: row.book_id,
        bookTitle: book?.title,
        bookImageUrl: book?.image_url ?? null,
        contentType: row.content_type,
        contentText: row.content_text,
        pageNumber: row.page_number ?? null,
        sourceId: row.source_id ?? null,
        createdAt: row.created_at,
      });
      if (!parsed.success) return failure(unavailableError("Reading record data is malformed."));
      records.push(parsed.data);
    }

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = records.at(-1);
      if (!last) return failure(unavailableError("The reading record page is empty."));
      nextCursor = encodeReadingRecordCursor({
        version: 1,
        value: last.createdAt,
        id: last.id,
        bookId: last.bookId,
      });
    }
    const pageInfo = PageInfoSchema.safeParse({ nextCursor, hasMore });
    return pageInfo.success
      ? success({ records, pageInfo: pageInfo.data })
      : failure(unavailableError("The reading record page is invalid."));
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}
