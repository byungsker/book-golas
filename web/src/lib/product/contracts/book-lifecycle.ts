import { z } from "zod";
import { BookIdSchema, IsoDateSchema, LocaleSchema } from "./common";
import {
  BookPrioritySchema,
  BookSchema,
  BookStatusSchema,
  type BookStatus,
} from "./books";
import {
  CreateBookRequestSchema,
  UpdateBookRequestSchema,
} from "./operations";

const dayInMilliseconds = 86_400_000;

export const BookSchedulePreviewSchema = z
  .object({
    startDate: IsoDateSchema,
    targetDate: IsoDateSchema,
    totalPages: z.number().int().min(0),
    targetDays: z.number().int().min(1),
    dailyTargetPages: z.number().int().min(0),
  })
  .strict()
  .superRefine((schedule, context) => {
    if (Date.parse(schedule.targetDate) < Date.parse(schedule.startDate)) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "targetDate must be on or after startDate",
      });
    }
  });

export const BookLifecycleCreateRequestSchema = z
  .object({
    action: z.literal("create"),
    locale: LocaleSchema,
    book: CreateBookRequestSchema,
  })
  .strict();

export const BookLifecycleUpdateRequestSchema = z
  .object({
    action: z.literal("update"),
    locale: LocaleSchema,
    book: UpdateBookRequestSchema,
  })
  .strict();

export const BookLifecycleRequestSchema = z.discriminatedUnion("action", [
  BookLifecycleCreateRequestSchema,
  BookLifecycleUpdateRequestSchema,
]);

export const BookLifecycleResponseSchema = z
  .object({
    kind: z.literal("saved"),
    action: z.enum(["create", "update"]),
    book: BookSchema,
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

const statusTransitions: Record<BookStatus, readonly BookStatus[]> = {
  planned: ["planned", "reading"],
  reading: ["reading", "completed", "will_retry"],
  completed: ["completed"],
  will_retry: ["will_retry", "reading"],
};

export function canTransitionBookStatus(from: BookStatus, to: BookStatus): boolean {
  return statusTransitions[from].includes(to);
}

export function normalizeIsoDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid ISO date");
  return new Date(timestamp).toISOString();
}

export function getBookSchedulePreview(input: {
  startDate: string;
  targetDate: string;
  totalPages: number;
  dailyTargetPages?: number | null;
}) {
  const startDate = normalizeIsoDate(input.startDate);
  const targetDate = normalizeIsoDate(input.targetDate);
  const targetDays = Math.max(
    1,
    Math.ceil((Date.parse(targetDate) - Date.parse(startDate)) / dayInMilliseconds),
  );
  const dailyTargetPages =
    input.dailyTargetPages ??
    (input.totalPages > 0 ? Math.ceil(input.totalPages / targetDays) : 0);

  return BookSchedulePreviewSchema.parse({
    startDate,
    targetDate,
    totalPages: input.totalPages,
    targetDays,
    dailyTargetPages,
  });
}

export type BookLifecycleRequest = z.infer<typeof BookLifecycleRequestSchema>;
export type BookLifecycleResponse = z.infer<typeof BookLifecycleResponseSchema>;
export type BookLifecycleCreateRequest = z.infer<typeof BookLifecycleCreateRequestSchema>;
export type BookLifecycleUpdateRequest = z.infer<typeof BookLifecycleUpdateRequestSchema>;
export type BookLifecycleBookId = z.infer<typeof BookIdSchema>;
export type BookLifecyclePriority = z.infer<typeof BookPrioritySchema>;
export type BookLifecycleStatus = z.infer<typeof BookStatusSchema>;
