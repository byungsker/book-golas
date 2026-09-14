import "server-only";

import {
  BookIdSchema,
  BookListRequestSchema,
  PageInfoSchema,
  type Book,
  type BookListRequest,
} from "@/lib/product/contracts";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { decodeBookCursor, encodeBookCursor } from "./cursor";
import { bookDtoSelect, getBookCursorValue, parseBookRow } from "./codec";
import {
  failure,
  mapDatabaseError,
  notFoundError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "./errors";
import { resolveProductSession, type ProductClientFactory } from "./context";

export type BookListData = {
  readonly books: Book[];
  readonly pageInfo: {
    readonly nextCursor: string | null;
    readonly hasMore: boolean;
  };
};

function filterValue(value: string | number): string {
  if (typeof value === "number") return String(value);
  return '"' + value.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"';
}

export async function listBooks(
  request: BookListRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<BookListData>> {
  const parsedRequest = BookListRequestSchema.safeParse(request);
  if (!parsedRequest.success) return failure(validationError());
  const requestData = parsedRequest.data;

  let cursor;
  if (requestData.pagination.cursor !== undefined) {
    const parsedCursor = decodeBookCursor(requestData.pagination.cursor);
    if (!parsedCursor.ok) return failure(parsedCursor.error);
    if (
      parsedCursor.value.field !== requestData.sort.field ||
      parsedCursor.value.direction !== requestData.sort.direction
    ) {
      return failure(validationError("The pagination cursor does not match the requested sort."));
    }
    cursor = parsedCursor.value;
  }

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  let query = session.value.supabase
    .from("books")
    .select(bookDtoSelect)
    .eq("user_id", session.value.userId)
    .is("deleted_at", null);

  if (requestData.status !== undefined) {
    query = query.eq("status", requestData.status);
  }

  if (cursor !== undefined) {
    const comparison = requestData.sort.direction === "asc" ? "gt" : "lt";
    const cursorFilter =
      cursor.value === null
        ? "and(" +
          requestData.sort.field +
          ".is.null,id." +
          comparison +
          "." +
          cursor.id +
          ")"
        : requestData.sort.field +
          "." +
          comparison +
          "." +
          filterValue(cursor.value) +
          ",and(" +
          requestData.sort.field +
          ".eq." +
          filterValue(cursor.value) +
          ",id." +
          comparison +
          "." +
          cursor.id +
          ")," +
          requestData.sort.field +
          ".is.null";
    query = query.or(cursorFilter);
  }

  const ascending = requestData.sort.direction === "asc";
  query = query
    .order(requestData.sort.field, { ascending, nullsFirst: false })
    .order("id", { ascending })
    .limit(requestData.pagination.limit + 1);

  const { data, error } = await query;
  if (error) return failure(mapDatabaseError(error));

  const rows: unknown[] = Array.isArray(data) ? data : [];
  const hasMore = rows.length > requestData.pagination.limit;
  const visibleRows = rows.slice(0, requestData.pagination.limit);
  const books: Book[] = [];

  for (const row of visibleRows) {
    const parsedBook = parseBookRow(row);
    if (!parsedBook.ok) return failure(parsedBook.error);
    books.push(parsedBook.value);
  }

  let nextCursor: string | null = null;
  if (hasMore) {
    const lastBook = books.at(-1);
    if (!lastBook) return failure(unavailableError("The book page is empty."));
    try {
      nextCursor = encodeBookCursor({
        version: 1,
        field: requestData.sort.field,
        direction: requestData.sort.direction,
        value: getBookCursorValue(lastBook, requestData.sort.field),
        id: lastBook.id,
      });
    } catch {
      return failure(unavailableError("The next pagination cursor could not be created."));
    }
  }

  const pageInfo = PageInfoSchema.safeParse({ nextCursor, hasMore });
  return pageInfo.success
    ? success({ books, pageInfo: pageInfo.data })
    : failure(unavailableError("The pagination result is invalid."));
}

export async function getBook(
  bookId: string,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<Book>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(notFoundError());

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const { data, error } = await session.value.supabase
    .from("books")
    .select(bookDtoSelect)
    .eq("id", parsedBookId.data)
    .eq("user_id", session.value.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return failure(mapDatabaseError(error));
  if (!data) return failure(notFoundError());
  return parseBookRow(data);
}
