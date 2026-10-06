import { z } from "zod";
import { BookSchema, ProgressEventSchema } from "@/shared/api/contracts";
import {
  ApiErrorResponseSchema,
  BookIdSchema,
  IsoDateSchema,
  LocaleSchema,
  RequestIdSchema,
} from "@/shared/api/contracts";

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

export const ProgressScheduleRequestSchema = z
  .object({
    action: z.literal("update_schedule"),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    targetDate: IsoDateSchema.optional(),
    dailyTargetPages: z.number().int().min(1).max(100_000).optional(),
    expectedUpdatedAt: IsoDateSchema,
    idempotencyKey: RequestIdSchema,
  })
  .strict()
  .refine(
    (request) => request.targetDate !== undefined || request.dailyTargetPages !== undefined,
    { message: "A schedule field is required." },
  );

export const ProgressUiMutationRequestSchema = z.union([
  ProgressUiRequestSchema,
  ProgressScheduleRequestSchema,
]);

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

export const ProgressScheduleSuccessSchema = z
  .object({
    kind: z.literal("schedule_updated"),
    book: BookSchema,
    duplicate: z.boolean(),
    invalidatedPaths: z.array(z.string().startsWith("/")),
  })
  .strict();

export const ProgressUiResponseSchema = z.union([
  ProgressUiSuccessSchema,
  ProgressScheduleSuccessSchema,
  ApiErrorResponseSchema,
]);

export type ProgressUiRequest = z.infer<typeof ProgressUiRequestSchema>;
export type ProgressScheduleRequest = z.infer<typeof ProgressScheduleRequestSchema>;
export type ProgressUiMutationRequest = z.infer<typeof ProgressUiMutationRequestSchema>;
export type ProgressUiSuccess = z.infer<typeof ProgressUiSuccessSchema>;
export type ProgressScheduleSuccess = z.infer<typeof ProgressScheduleSuccessSchema>;
export type ProgressUiResponse = z.infer<typeof ProgressUiResponseSchema>;
