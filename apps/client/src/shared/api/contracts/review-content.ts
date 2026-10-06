import { z } from "zod";

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
