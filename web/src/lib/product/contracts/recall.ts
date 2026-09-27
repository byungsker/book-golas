import { z } from "zod";
import { BookIdSchema, IsoDateSchema, LocaleSchema, PageInfoSchema, PaginationSchema, RecordIdSchema } from "./common";
import { RecallSearchHistorySchema, RecallSearchResultSchema } from "./ai";

export const RecallScopeSchema = z.enum(["global", "book"]);
export type RecallScope = z.infer<typeof RecallScopeSchema>;

export const RecallUiStateSchema = z.enum([
  "idle",
  "loading",
  "success",
  "empty",
  "unauthorized",
  "consent_required",
  "quota_exceeded",
  "provider_error",
  "offline",
  "error",
]);
export type RecallUiState = z.infer<typeof RecallUiStateSchema>;

export const RecallHistoryRequestSchema = z.object({
  locale: LocaleSchema,
  bookId: BookIdSchema.optional(),
  pagination: PaginationSchema,
}).strict();
export type RecallHistoryRequest = z.infer<typeof RecallHistoryRequestSchema>;

export const RecallSearchApiRequestSchema = z.object({
  action: z.literal("search"),
  locale: LocaleSchema,
  query: z.string().trim().min(1).max(500),
  bookId: BookIdSchema.optional(),
  pagination: PaginationSchema,
}).strict();
export type RecallSearchApiRequest = z.infer<typeof RecallSearchApiRequestSchema>;

export const RecallDeleteHistoryRequestSchema = z.object({
  action: z.literal("delete_history"),
  locale: LocaleSchema,
  historyId: RecordIdSchema,
  bookId: BookIdSchema.optional(),
}).strict();
export type RecallDeleteHistoryRequest = z.infer<typeof RecallDeleteHistoryRequestSchema>;

export const RecallSourceRequestSchema = z.object({
  locale: LocaleSchema,
  bookId: BookIdSchema,
  sourceId: RecordIdSchema,
}).strict();
export type RecallSourceRequest = z.infer<typeof RecallSourceRequestSchema>;

export const RecallHistoryPageSchema = z.object({
  kind: z.literal("history"),
  scope: RecallScopeSchema,
  bookId: BookIdSchema.nullable(),
  history: z.array(RecallSearchHistorySchema),
  suggestions: z.array(z.string().trim().min(1).max(500)).max(12),
  pageInfo: PageInfoSchema,
}).strict();
export type RecallHistoryPage = z.infer<typeof RecallHistoryPageSchema>;

export const RecallSearchResponseSchema = z.object({
  kind: z.literal("search"),
  scope: RecallScopeSchema,
  bookId: BookIdSchema.nullable(),
  result: RecallSearchResultSchema,
}).strict();
export type RecallSearchResponse = z.infer<typeof RecallSearchResponseSchema>;

export const RecallDeleteHistoryResponseSchema = z.object({
  kind: z.literal("deleted"),
  historyId: RecordIdSchema,
  deleted: z.boolean(),
}).strict();
export type RecallDeleteHistoryResponse = z.infer<typeof RecallDeleteHistoryResponseSchema>;

export const RecallSourceImageResponseSchema = z.object({
  kind: z.literal("source_image"),
  sourceId: RecordIdSchema,
  bookId: BookIdSchema,
  signedUrl: z.string().url(),
  expiresAt: IsoDateSchema,
}).strict();
export type RecallSourceImageResponse = z.infer<typeof RecallSourceImageResponseSchema>;
