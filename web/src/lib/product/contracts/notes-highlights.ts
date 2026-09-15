import { z } from "zod";
import { BookIdSchema, IsoDateSchema, LocaleSchema, RecordIdSchema } from "./common";

export const consumerRecordTypeValues = ["note", "highlight", "memorable_page"] as const;
export const ConsumerRecordTypeSchema = z.enum(consumerRecordTypeValues);
export type ConsumerRecordType = z.infer<typeof ConsumerRecordTypeSchema>;

export const indexStatusValues = ["pending", "ready", "failed", "skipped"] as const;
export const IndexStatusSchema = z.enum(indexStatusValues);
export type IndexStatus = z.infer<typeof IndexStatusSchema>;

export const NormalizedHighlightRectangleSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .superRefine((rectangle, context) => {
    if (rectangle.x + rectangle.width > 1) {
      context.addIssue({ code: "custom", path: ["width"], message: "x + width must be at most 1" });
    }
    if (rectangle.y + rectangle.height > 1) {
      context.addIssue({ code: "custom", path: ["height"], message: "y + height must be at most 1" });
    }
  });
export type NormalizedHighlightRectangle = z.infer<typeof NormalizedHighlightRectangleSchema>;

const nullableText = z.string().trim().max(20_000).nullable();

export const ConsumerRecordSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    recordType: ConsumerRecordTypeSchema,
    pageNumber: z.number().int().min(1).nullable(),
    contentText: z.string().max(20_000),
    caption: z.string().trim().max(2_000).nullable(),
    imageUrl: nullableText,
    rectangles: z.array(NormalizedHighlightRectangleSchema).max(100),
    sourceId: RecordIdSchema.nullable(),
    sourceHref: z.string().url().nullable(),
    indexStatus: IndexStatusSchema,
    indexError: z.string().trim().max(500).nullable(),
    createdAt: IsoDateSchema,
    updatedAt: IsoDateSchema,
  })
  .strict();
export type ConsumerRecord = z.infer<typeof ConsumerRecordSchema>;

export const NotesHighlightsMutationSchema = z
  .object({
    action: z.enum(["create", "update", "delete", "retry"]),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    recordId: RecordIdSchema.optional(),
    recordType: ConsumerRecordTypeSchema.optional(),
    pageNumber: z.number().int().min(1).nullable().optional(),
    contentText: z.string().max(20_000).optional().default(""),
    caption: z.string().trim().max(2_000).nullable().optional(),
    imageUrl: nullableText.optional(),
    rectangles: z.array(NormalizedHighlightRectangleSchema).max(100).optional().default([]),
    sourceId: RecordIdSchema.nullable().optional(),
    sourceHref: z.string().url().nullable().optional(),
    aiConsent: z.boolean().optional().default(false),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((input, context) => {
    if ((input.action === "create" || input.action === "update") && !input.recordType) {
      context.addIssue({ code: "custom", path: ["recordType"], message: "recordType is required" });
    }
    if ((input.action === "update" || input.action === "delete" || input.action === "retry") && !input.recordId) {
      context.addIssue({ code: "custom", path: ["recordId"], message: "recordId is required" });
    }
    if (input.recordType === "highlight" && input.rectangles.length === 0) {
      context.addIssue({ code: "custom", path: ["rectangles"], message: "highlights need at least one rectangle" });
    }
    if (input.recordType !== "highlight" && input.rectangles.length > 0) {
      context.addIssue({ code: "custom", path: ["rectangles"], message: "rectangles are only valid for highlights" });
    }
    if (input.sourceHref !== undefined && input.sourceHref !== null) {
      try {
        if (new URL(input.sourceHref).protocol !== "https:") {
          context.addIssue({ code: "custom", path: ["sourceHref"], message: "sourceHref must use HTTPS" });
        }
      } catch {
        context.addIssue({ code: "custom", path: ["sourceHref"], message: "sourceHref must be a URL" });
      }
    }
  });
export type NotesHighlightsMutation = z.infer<typeof NotesHighlightsMutationSchema>;

export const NotesHighlightsListResponseSchema = z
  .object({
    kind: z.literal("list"),
    records: z.array(ConsumerRecordSchema),
  })
  .strict();

export const NotesHighlightsSavedResponseSchema = z
  .object({
    kind: z.enum(["saved", "retry"]),
    record: ConsumerRecordSchema,
    duplicate: z.boolean(),
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

export const NotesHighlightsDeletedResponseSchema = z
  .object({
    kind: z.literal("deleted"),
    recordId: RecordIdSchema,
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

export const NotesHighlightsResponseSchema = z.discriminatedUnion("kind", [
  NotesHighlightsListResponseSchema,
  NotesHighlightsSavedResponseSchema,
  NotesHighlightsDeletedResponseSchema,
]);
export type NotesHighlightsResponse = z.infer<typeof NotesHighlightsResponseSchema>;

export function normalizeHighlightRectangles(
  rectangles: readonly NormalizedHighlightRectangle[],
): NormalizedHighlightRectangle[] {
  return rectangles.map((rectangle) => ({
    x: Number(rectangle.x.toFixed(6)),
    y: Number(rectangle.y.toFixed(6)),
    width: Number(rectangle.width.toFixed(6)),
    height: Number(rectangle.height.toFixed(6)),
  }));
}
