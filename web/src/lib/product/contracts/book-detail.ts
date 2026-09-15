import { z } from "zod";
import { BookIdSchema, IsoDateSchema, LocaleSchema } from "./common";
import { BookSchema, type BookStatus } from "./books";

export const bookDetailActionValues = ["start", "resume", "pause", "complete", "delete"] as const;
export const BookDetailActionSchema = z.enum(bookDetailActionValues);

export const BookDetailRequestSchema = z
  .object({
    action: BookDetailActionSchema,
    locale: LocaleSchema,
    bookId: BookIdSchema,
    targetDate: IsoDateSchema.optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (!["start", "resume"].includes(request.action) && request.targetDate !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "targetDate is only valid when starting or resuming a book",
      });
    }
  });

export const BookDetailUpdatedResponseSchema = z
  .object({
    kind: z.literal("updated"),
    action: z.enum(["start", "resume", "pause", "complete"]),
    book: BookSchema,
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

export const BookDetailDeletedResponseSchema = z
  .object({
    kind: z.literal("deleted"),
    action: z.literal("delete"),
    book: z.null(),
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

export const BookDetailResponseSchema = z.discriminatedUnion("kind", [
  BookDetailUpdatedResponseSchema,
  BookDetailDeletedResponseSchema,
]);

const actionsByStatus: Record<BookStatus, readonly z.infer<typeof BookDetailActionSchema>[]> = {
  planned: ["start", "delete"],
  reading: ["pause", "complete", "delete"],
  completed: ["delete"],
  will_retry: ["resume", "delete"],
};

export function canApplyBookDetailAction(
  status: BookStatus,
  action: z.infer<typeof BookDetailActionSchema>,
): boolean {
  return actionsByStatus[status].includes(action);
}

export type BookDetailAction = z.infer<typeof BookDetailActionSchema>;
export type BookDetailRequest = z.infer<typeof BookDetailRequestSchema>;
export type BookDetailResponse = z.infer<typeof BookDetailResponseSchema>;
