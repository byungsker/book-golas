import "server-only";

import { z } from "zod";
import {
  BookIdSchema,
  BookStatusSchema,
  CreateBookRequestSchema,
  IsoDateSchema,
  UpdateBookRequestSchema,
  canTransitionBookStatus,
  normalizeIsoDate,
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
import { deleteOwnedBookImages } from "./consumer-images";

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
  readonly planned_start_date: string | null;
  readonly paused_at: string | null;
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
  start_date?: string;
  target_date?: string;
  planned_start_date?: string | null;
  paused_at?: string | null;
  attempt_count?: number;
  status?: UpdateBookRequest["status"];
  daily_target_pages?: number | null;
  priority?: number | null;
  review?: string | null;
  rating?: number | null;
  review_link?: string | null;
  long_review?: string | null;
};

const CurrentBookStateSchema = z
  .object({
    status: BookStatusSchema,
    start_date: IsoDateSchema,
    target_date: IsoDateSchema,
    planned_start_date: IsoDateSchema.nullable(),
    paused_at: IsoDateSchema.nullable(),
    attempt_count: z.number().int().min(1),
    total_pages: z.number().int().min(0),
  })
  .passthrough();

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
    start_date: normalizeIsoDate(input.startDate),
    target_date: normalizeIsoDate(input.targetDate),
    image_url: input.imageUrl,
    current_page: 0,
    total_pages: input.totalPages,
    status: input.status,
    attempt_count: 1,
    daily_target_pages: input.dailyTargetPages,
    priority: input.priority,
    planned_start_date: input.plannedStartDate ? normalizeIsoDate(input.plannedStartDate) : null,
    paused_at: null,
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
  const { data: currentData, error: currentError } = await session.value.supabase
    .from("books")
    .select("status,start_date,target_date,planned_start_date,paused_at,attempt_count,total_pages")
    .eq("id", parsedBookId.data)
    .eq("user_id", session.value.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (currentError) return failure(mapDatabaseError(currentError));
  if (!currentData) return failure(notFoundError());

  const current = CurrentBookStateSchema.safeParse(currentData);
  if (!current.success) return failure(validationError("The saved book data is invalid."));

  const nextStatus = input.status ?? current.data.status;
  if (input.status && !canTransitionBookStatus(current.data.status, input.status)) {
    return failure(validationError("The book status transition is not allowed."));
  }

  const nextStartDate = input.startDate ? normalizeIsoDate(input.startDate) : current.data.start_date;
  const nextTargetDate = input.targetDate ? normalizeIsoDate(input.targetDate) : current.data.target_date;
  const nextPlannedStartDate = input.plannedStartDate === undefined
    ? current.data.planned_start_date
    : input.plannedStartDate === null
      ? null
      : normalizeIsoDate(input.plannedStartDate);
  if (
    input.attemptCount !== undefined &&
    (input.attemptCount < current.data.attempt_count || input.attemptCount > current.data.attempt_count + 1)
  ) {
    return failure(validationError("The attempt count can only stay the same or increase by one."));
  }
  const effectiveStartDate = nextStatus === "planned" && nextPlannedStartDate
    ? nextPlannedStartDate
    : nextStartDate;
  if (Date.parse(nextTargetDate) < Date.parse(nextStartDate) || Date.parse(nextTargetDate) < Date.parse(effectiveStartDate)) {
    return failure(validationError("The target date must be on or after the effective start date."));
  }

  const updates: BookUpdateRow = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.author !== undefined) updates.author = input.author;
  if (input.startDate !== undefined) updates.start_date = nextStartDate;
  if (input.targetDate !== undefined) updates.target_date = nextTargetDate;
  if (input.plannedStartDate !== undefined) updates.planned_start_date = nextPlannedStartDate;
  if (input.status !== undefined) updates.status = input.status;
  if (nextStatus === "reading" && current.data.planned_start_date !== null && input.plannedStartDate === undefined) {
    updates.planned_start_date = null;
  }
  if (input.dailyTargetPages !== undefined) {
    updates.daily_target_pages = input.dailyTargetPages;
  }
  if (input.attemptCount !== undefined) updates.attempt_count = input.attemptCount;
  if (input.pausedAt !== undefined) updates.paused_at = input.pausedAt;
  if (nextStatus === "will_retry" && input.pausedAt === undefined && current.data.paused_at === null) {
    updates.paused_at = new Date().toISOString();
  }
  if (["planned", "reading", "completed"].includes(nextStatus) && input.pausedAt === undefined && current.data.paused_at !== null) {
    updates.paused_at = null;
  }
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.rating !== undefined) updates.rating = input.rating;
  if (input.review !== undefined) updates.review = input.review;
  if (input.reviewLink !== undefined) updates.review_link = input.reviewLink;
  if (input.longReview !== undefined) updates.long_review = input.longReview;
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

  const storage = (session.value.supabase as unknown as { storage?: { from?: unknown } }).storage;
  if (storage && typeof storage.from === "function") {
    const cleaned = await deleteOwnedBookImages(
      parsedBookId.data,
      () => Promise.resolve(session.value.supabase),
    );
    if (!cleaned.ok) return failure(cleaned.error);
  }

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
