import { z } from "zod";
import {
  BookIdSchema,
  ImageIdSchema,
  IsoDateSchema,
  RecordIdSchema,
} from "./common";

export const bookStatusValues = ["planned", "reading", "completed", "will_retry"] as const;
export const BookStatusSchema = z.enum(bookStatusValues);
export const bookPriorityValues = [1, 2, 3, 4] as const;
export const BookPrioritySchema = z.number().int().min(1).max(4);

const nullableDate = IsoDateSchema.nullable();
const nullableText = z.string().min(1).nullable();

export const BookSchema = z
  .object({
    id: BookIdSchema,
    title: z.string().trim().min(1).max(500),
    author: nullableText,
    startDate: IsoDateSchema,
    targetDate: IsoDateSchema,
    imageUrl: nullableText,
    currentPage: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    status: BookStatusSchema,
    attemptCount: z.number().int().min(1),
    dailyTargetPages: z.number().int().min(1).nullable(),
    priority: BookPrioritySchema.nullable(),
    pausedAt: nullableDate,
    plannedStartDate: nullableDate,
    deletedAt: nullableDate,
    genre: nullableText,
    publisher: nullableText,
    isbn: nullableText,
    rating: z.number().int().min(0).max(5).nullable(),
    review: z.string().nullable(),
    reviewLink: nullableText,
    aladinUrl: nullableText,
    longReview: z.string().nullable(),
    price: z.number().int().min(0).nullable(),
    createdAt: nullableDate,
    updatedAt: nullableDate,
  })
  .strict()
  .superRefine((book, context) => {
    if (book.currentPage > book.totalPages) {
      context.addIssue({
        code: "custom",
        path: ["currentPage"],
        message: "currentPage must not exceed totalPages",
      });
    }
  });

export const BookSearchResultSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(500),
    imageUrl: nullableText,
    totalPages: z.number().int().min(0).nullable(),
    isbn: nullableText,
    genre: nullableText,
    publisher: nullableText,
    aladinUrl: nullableText,
    price: z.number().int().min(0).nullable(),
  })
  .strict();

export const ProgressEventSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    page: z.number().int().min(0),
    previousPage: z.number().int().min(0),
    createdAt: IsoDateSchema,
  })
  .strict()
  .superRefine((event, context) => {
    if (event.page < event.previousPage) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "page must not be below previousPage",
      });
    }
  });

export const ReadingSessionSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    startedAt: IsoDateSchema,
    endedAt: nullableDate,
    durationSeconds: z.number().int().min(0).max(28_800),
    createdAt: nullableDate,
  })
  .strict()
  .superRefine((session, context) => {
    if (session.endedAt && Date.parse(session.endedAt) < Date.parse(session.startedAt)) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "endedAt must not precede startedAt",
      });
    }
  });

export const GoalSchema = z
  .object({
    id: RecordIdSchema,
    year: z.number().int().min(2000).max(2100),
    targetBooks: z.number().int().min(0).max(1000),
    createdAt: nullableDate,
    updatedAt: nullableDate,
  })
  .strict();

export const ImageSchema = z
  .object({
    id: ImageIdSchema,
    bookId: BookIdSchema,
    imageUrl: z.string().trim().min(1),
    caption: z.string().nullable(),
    pageNumber: z.number().int().min(1).nullable(),
  })
  .strict();

export const HighlightPointSchema = z
  .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
  .strict();

export const HighlightSchema = z
  .object({
    id: RecordIdSchema,
    points: z.array(HighlightPointSchema).min(1),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    opacity: z.number().min(0).max(1),
    strokeWidth: z.number().positive(),
  })
  .strict();

export const noteContentTypeValues = ["note", "highlight", "photo_ocr"] as const;
export const NoteSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    contentType: z.enum(noteContentTypeValues),
    contentText: z.string(),
    pageNumber: z.number().int().min(1).nullable(),
    sourceId: RecordIdSchema.nullable(),
    createdAt: IsoDateSchema,
  })
  .strict();

export type Book = z.infer<typeof BookSchema>;
export type BookStatus = z.infer<typeof BookStatusSchema>;
export type BookPriority = z.infer<typeof BookPrioritySchema>;
export type BookSearchResult = z.infer<typeof BookSearchResultSchema>;
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;
export type ReadingSession = z.infer<typeof ReadingSessionSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type Note = z.infer<typeof NoteSchema>;
