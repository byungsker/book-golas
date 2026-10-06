import { z } from "zod";
import { IsoDateSchema, LocaleSchema } from "./common";

export const ReadingGoalUpdateRequestSchema = z
  .object({
    locale: LocaleSchema,
    year: z.number().int().min(2000).max(2100),
    targetBooks: z.number().int().min(1).max(999),
  })
  .strict();
export type ReadingGoalUpdateRequest = z.infer<typeof ReadingGoalUpdateRequestSchema>;

export const ReadingGoalUpdateSuccessSchema = z
  .object({
    kind: z.literal("goal_updated"),
    year: z.number().int().min(2000).max(2100),
    targetBooks: z.number().int().min(1).max(999),
    updatedAt: IsoDateSchema,
  })
  .strict();

export const ReadingGoalUpdateResponseSchema = z.union([
  ReadingGoalUpdateSuccessSchema,
  z.object({ error: z.unknown() }).strict(),
]);
