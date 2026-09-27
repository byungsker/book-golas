import { z } from "zod";
import { BookSchema, ReadingSessionSchema } from "./books";
import {
  ApiErrorResponseSchema,
  BookIdSchema,
  IsoDateSchema,
  LocaleSchema,
  RequestIdSchema,
} from "./common";

export const timerMinimumSeconds = 30;
export const timerMaximumSeconds = 28_800;
export const timerRequestMaximumSeconds = 86_400;

export const TimerFinishRequestSchema = z
  .object({
    action: z.literal("finish"),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    startedAt: IsoDateSchema,
    endedAt: IsoDateSchema,
    durationSeconds: z.number().int().min(0).max(timerRequestMaximumSeconds),
    idempotencyKey: RequestIdSchema,
  })
  .strict()
  .superRefine((request, context) => {
    if (Date.parse(request.endedAt) < Date.parse(request.startedAt)) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "endedAt must not precede startedAt",
      });
    }
  });

export const TimerFinishSuccessSchema = z
  .object({
    kind: z.enum(["saved", "discarded"]),
    book: BookSchema,
    session: ReadingSessionSchema.nullable(),
    totalReadingSeconds: z.number().int().min(0),
    duplicate: z.boolean(),
    reason: z.enum(["minimum", "max-duration"]).nullable(),
    invalidatedPaths: z.array(z.string().startsWith("/")),
  })
  .strict();

export const TimerResponseSchema = z.union([
  TimerFinishSuccessSchema,
  ApiErrorResponseSchema,
]);

export type TimerFinishRequest = z.infer<typeof TimerFinishRequestSchema>;
export type TimerFinishSuccess = z.infer<typeof TimerFinishSuccessSchema>;
export type TimerResponse = z.infer<typeof TimerResponseSchema>;
