import "server-only";

import {
  BookIdSchema,
  CreateBookRequestSchema,
  UpdateBookRequestSchema,
  type Book,
  type CreateBookRequest,
  type UpdateBookRequest,
} from "@/lib/product/contracts";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { bookDtoSelect, parseBookRow } from "./codec";
import {
  failure,
  mapDatabaseError,
  notFoundError,
  success,
  validationError,
  type ProductResult,
} from "./errors";
import { resolveProductSession, type ProductClientFactory } from "./context";

type BookInsertRow = {
  readonly user_id: string;
  readonly title: string;
  readonly author: string | null;
  readonly start_date: string;
  readonly target_date: string;
  readonly image_url: string | null;
  readonly current_page: number;
  readonly total_pages: number;
  readonly status: CreateBookRequest["status"];
  readonly attempt_count: number;
  readonly daily_target_pages: number | null;
  readonly priority: number | null;
  readonly deleted_at: null;
  readonly genre: string | null;
  readonly publisher: string | null;
  readonly isbn: string | null;
  readonly aladin_url: string | null;
  readonly price: number | null;
};

type BookUpdateRow = {
  title?: string;
  author?: string | null;
  target_date?: string;
  status?: UpdateBookRequest["status"];
  daily_target_pages?: number | null;
  priority?: number | null;
  review?: string | null;
};

function parseReturnedBook(value: unknown): ProductResult<Book> {
  return parseBookRow(value);
}

export async function createBook(
  request: CreateBookRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<Book>> {
  const parsedRequest = CreateBookRequestSchema.safeParse(request);
  if (!parsedRequest.success) return failure(validationError());

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const input = parsedRequest.data;
  const insert: BookInsertRow = {
    user_id: session.value.userId,
    title: input.title,
    author: input.author,
    start_date: input.startDate,
    target_date: input.targetDate,
    image_url: input.imageUrl,
    current_page: 0,
    total_pages: input.totalPages,
    status: input.status,
    attempt_count: 1,
    daily_target_pages: input.dailyTargetPages,
    priority: input.priority,
    deleted_at: null,
    genre: input.genre,
    publisher: input.publisher,
    isbn: input.isbn,
    aladin_url: input.aladinUrl,
    price: input.price,
  };

  const { data, error } = await session.value.supabase
    .from("books")
    .insert(insert)
    .select(bookDtoSelect)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!data) return failure(mapDatabaseError({ code: "PGRST204" }));
  return parseReturnedBook(data);
}

export async function updateBook(
  request: UpdateBookRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<Book>> {
  const parsedRequest = UpdateBookRequestSchema.safeParse(request);
  if (!parsedRequest.success) return failure(validationError());
  const parsedBookId = BookIdSchema.safeParse(parsedRequest.data.bookId);
  if (!parsedBookId.success) return failure(notFoundError());

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const input = parsedRequest.data;
  const updates: BookUpdateRow = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.author !== undefined) updates.author = input.author;
  if (input.targetDate !== undefined) updates.target_date = input.targetDate;
  if (input.status !== undefined) updates.status = input.status;
  if (input.dailyTargetPages !== undefined) {
    updates.daily_target_pages = input.dailyTargetPages;
  }
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.review !== undefined) updates.review = input.review;
  if (Object.keys(updates).length === 0) return failure(validationError());

  const { data, error } = await session.value.supabase
    .from("books")
    .update(updates)
    .eq("id", parsedBookId.data)
    .eq("user_id", session.value.userId)
    .is("deleted_at", null)
    .select(bookDtoSelect)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!data) return failure(notFoundError());
  return parseReturnedBook(data);
}

export async function deleteBook(
  bookId: string,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ readonly deleted: true }>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(notFoundError());

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const { data, error } = await session.value.supabase
    .from("books")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedBookId.data)
    .eq("user_id", session.value.userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!data) return failure(notFoundError());
  return success({ deleted: true });
}
