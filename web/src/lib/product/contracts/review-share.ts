import { z } from "zod";
import {
  BookIdSchema,
  LocaleSchema,
  RequestIdSchema,
} from "./common";
import { BookSchema } from "./books";

export const ReviewTextSchema = z.string().max(500);
export const LongReviewTextSchema = z.string().max(20_000);

export const ReviewLinkSchema = z
  .string()
  .trim()
  .url()
  .max(2_000)
  .superRefine((value, context) => {
    try {
      if (new URL(value).protocol !== "https:") {
        context.addIssue({ code: "custom", message: "reviewLink must use HTTPS" });
      }
    } catch {
      context.addIssue({ code: "custom", message: "reviewLink must be a valid URL" });
    }
  });

const ReviewFields = {
  rating: z.number().int().min(0).max(5).nullable(),
  review: ReviewTextSchema.nullable(),
  longReview: LongReviewTextSchema.nullable(),
  reviewLink: ReviewLinkSchema.nullable(),
} as const;

export const ReviewSaveRequestSchema = z
  .object({
    action: z.literal("save"),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    ...ReviewFields,
    idempotencyKey: RequestIdSchema,
  })
  .strict();

export const ReviewGenerateRequestSchema = z
  .object({
    action: z.literal("generate"),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    aiConsent: z.boolean(),
    idempotencyKey: RequestIdSchema,
  })
  .strict();

export const ReviewMutationSchema = z.discriminatedUnion("action", [
  ReviewSaveRequestSchema,
  ReviewGenerateRequestSchema,
]);

export const ReviewSavedResponseSchema = z
  .object({
    kind: z.literal("saved"),
    book: BookSchema,
    canonicalUrl: z.string().url(),
    duplicate: z.boolean(),
    invalidatedPaths: z.array(z.string().min(1)),
  })
  .strict();

export const ReviewDraftResponseSchema = z
  .object({
    kind: z.literal("draft"),
    draft: z.string().max(20_000),
    memosUsed: z.number().int().min(0),
  })
  .strict();

export const ReviewResponseSchema = z.discriminatedUnion("kind", [
  ReviewSavedResponseSchema,
  ReviewDraftResponseSchema,
]);

export const ReviewEditorStateSchema = z.enum([
  "idle",
  "saving",
  "saved",
  "generating",
  "draft",
  "empty",
  "consent",
  "timeout",
  "provider_error",
  "quota",
  "offline",
  "error",
]);

export const ReviewShareMethodSchema = z.enum(["native", "clipboard", "download", "cancelled"]);

export type ReviewMutation = z.infer<typeof ReviewMutationSchema>;
export type ReviewSaveRequest = z.infer<typeof ReviewSaveRequestSchema>;
export type ReviewGenerateRequest = z.infer<typeof ReviewGenerateRequestSchema>;
export type ReviewSavedResponse = z.infer<typeof ReviewSavedResponseSchema>;
export type ReviewDraftResponse = z.infer<typeof ReviewDraftResponseSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type ReviewEditorState = z.infer<typeof ReviewEditorStateSchema>;
export type ReviewShareMethod = z.infer<typeof ReviewShareMethodSchema>;

export function normalizeReviewValue(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function reviewShareCard(input: {
  book: Pick<z.infer<typeof BookSchema>, "title" | "author" | "rating" | "review" | "longReview">;
  canonicalUrl: string;
}): string {
  const lines = [
    input.book.title,
    input.book.author ? `by ${input.book.author}` : null,
    input.book.rating === null ? null : `Rating: ${input.book.rating}/5`,
    input.book.review?.trim() || null,
    input.book.longReview?.trim() || null,
    "",
    input.canonicalUrl,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}
