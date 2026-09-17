import { z } from "zod";
import {
  BookIdSchema,
  BookSchema,
  IsoDateSchema,
  type Book,
  type Sort,
} from "@/lib/product/contracts";
import { failure, success, unavailableError, type ProductResult } from "./errors";

const nullableText = z.string().min(1).nullable();
const nullableDate = IsoDateSchema.nullable();

export const bookDtoColumns = [
  "id",
  "title",
  "author",
  "start_date",
  "target_date",
  "image_url",
  "current_page",
  "total_pages",
  "total_reading_seconds",
  "status",
  "attempt_count",
  "daily_target_pages",
  "priority",
  "paused_at",
  "planned_start_date",
  "deleted_at",
  "genre",
  "publisher",
  "isbn",
  "rating",
  "review",
  "review_link",
  "aladin_url",
  "long_review",
  "price",
  "created_at",
  "updated_at",
] as const;

export const bookDtoSelect = bookDtoColumns.join(",");

const BookRowSchema = z
  .object({
    id: BookIdSchema,
    title: z.string().trim().min(1).max(500),
    author: nullableText,
    start_date: IsoDateSchema,
    target_date: IsoDateSchema,
    image_url: nullableText,
    current_page: z.number().int().min(0),
    total_pages: z.number().int().min(0),
    total_reading_seconds: z.number().int().min(0).nullable().optional(),
    status: z.enum(["planned", "reading", "completed", "will_retry"]),
    attempt_count: z.number().int().min(1),
    daily_target_pages: z.number().int().min(1).nullable(),
    priority: z.number().int().min(1).max(4).nullable(),
    paused_at: nullableDate,
    planned_start_date: nullableDate,
    deleted_at: nullableDate,
    genre: nullableText,
    publisher: nullableText,
    isbn: nullableText,
    rating: z.number().int().min(0).max(5).nullable(),
    review: z.string().nullable(),
    review_link: nullableText,
    aladin_url: nullableText,
    long_review: z.string().nullable(),
    price: z.number().int().min(0).nullable(),
    created_at: nullableDate,
    updated_at: nullableDate,
  })
  .strict();

export function parseBookRow(value: unknown): ProductResult<Book> {
  const row = BookRowSchema.safeParse(value);
  if (!row.success) return failure(unavailableError("Book data is malformed."));

  const book = BookSchema.safeParse({
    id: row.data.id,
    title: row.data.title,
    author: row.data.author,
    startDate: row.data.start_date,
    targetDate: row.data.target_date,
    imageUrl: row.data.image_url,
    currentPage: row.data.current_page,
    totalPages: row.data.total_pages,
    totalReadingSeconds: row.data.total_reading_seconds ?? 0,
    status: row.data.status,
    attemptCount: row.data.attempt_count,
    dailyTargetPages: row.data.daily_target_pages,
    priority: row.data.priority,
    pausedAt: row.data.paused_at,
    plannedStartDate: row.data.planned_start_date,
    deletedAt: row.data.deleted_at,
    genre: row.data.genre,
    publisher: row.data.publisher,
    isbn: row.data.isbn,
    rating: row.data.rating,
    review: row.data.review,
    reviewLink: row.data.review_link,
    aladinUrl: row.data.aladin_url,
    longReview: row.data.long_review,
    price: row.data.price,
    createdAt: row.data.created_at,
    updatedAt: row.data.updated_at,
  });
  return book.success ? success(book.data) : failure(unavailableError("Book data is invalid."));
}

function assertNever(value: never): never {
  throw new Error("Unsupported book sort field: " + value);
}

export function getBookCursorValue(
  book: Book,
  field: Sort["field"],
): string | number | null {
  switch (field) {
    case "created_at":
      return book.createdAt;
    case "updated_at":
      return book.updatedAt;
    case "title":
      return book.title;
    case "current_page":
      return book.currentPage;
    default:
      return assertNever(field);
  }
}
