import { z } from "zod";
import { BookSchema, ProgressEventSchema } from "./books";
import {
  ApiErrorResponseSchema,
  BookIdSchema,
  IsoDateSchema,
  LocaleSchema,
} from "./common";

const ConsumerProgressBookSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(500).nullable(),
    startDate: IsoDateSchema,
    targetDate: IsoDateSchema,
    plannedStartDate: IsoDateSchema.nullable(),
    imageUrl: z.string().trim().min(1).nullable(),
    currentPage: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    status: z.enum(["planned", "reading", "completed", "will_retry", "unknown"]),
    createdAt: IsoDateSchema.nullable(),
    updatedAt: IsoDateSchema.nullable(),
    pausedAt: IsoDateSchema.nullable(),
  })
  .strict();

export const ProgressUiRequestSchema = z
  .object({
    locale: LocaleSchema,
    bookId: BookIdSchema,
    currentPage: z.number().int().min(0),
    expectedCurrentPage: z.number().int().min(0),
    idempotencyKey: z.string().uuid(),
    readingTime: z.number().int().min(0).max(28_800).optional(),
  })
  .strict();

export const ProgressUiSuccessSchema = z
  .object({
    kind: z.literal("updated"),
    book: z.union([BookSchema, ConsumerProgressBookSchema]),
    history: z.array(ProgressEventSchema),
    historyRecorded: z.boolean(),
    duplicate: z.boolean(),
    invalidatedPaths: z.array(z.string().startsWith("/")),
  })
  .strict();

export const ProgressUiResponseSchema = z.union([
  ProgressUiSuccessSchema,
  ApiErrorResponseSchema,
]);

export type ProgressUiRequest = z.infer<typeof ProgressUiRequestSchema>;
export type ProgressUiSuccess = z.infer<typeof ProgressUiSuccessSchema>;
export type ProgressUiResponse = z.infer<typeof ProgressUiResponseSchema>;
