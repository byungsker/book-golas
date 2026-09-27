import { z } from "zod";
import {
  BookIdSchema,
  BookSearchResultSchema,
  ImageIdSchema,
  IsoDateSchema,
  PageInfoSchema,
  RecallSearchResultSchema,
  RecallSourceSchema,
  RecommendationResultSchema,
  RecordIdSchema,
  type BookSearchResult,
} from "@/lib/product/contracts";

const nullableProviderText = z.string().trim().max(2_000).nullable();

/** The stable wire shape returned by supabase/functions/aladin-books. */
export const AladinBookWireSchema = z
  .object({
    title: z.string().trim().max(500),
    author: z.string().trim().max(500),
    cover: nullableProviderText,
    isbn: nullableProviderText,
    publisher: nullableProviderText,
    genre: nullableProviderText,
    link: nullableProviderText,
    totalPages: z.number().int().min(0).nullable(),
    price: z.number().int().min(0).nullable(),
  })
  .strict();

export const AladinBooksResponseSchema = z
  .object({ books: z.array(AladinBookWireSchema).max(10) })
  .strict();
export type AladinBooksResponse = z.infer<typeof AladinBooksResponseSchema>;

const GoogleImageLinksSchema = z
  .object({ thumbnail: z.string().trim().url().optional(), smallThumbnail: z.string().trim().url().optional() })
  .passthrough();

const GoogleIndustryIdentifierSchema = z
  .object({ type: z.string().trim().min(1).max(40), identifier: z.string().trim().min(1).max(40) })
  .passthrough();

export const GoogleBooksPayloadSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            selfLink: z.string().trim().url().optional(),
            volumeInfo: z
              .object({
                title: z.string().trim().max(500).optional(),
                authors: z.array(z.string().trim().max(500)).optional(),
                publisher: z.string().trim().max(500).optional(),
                pageCount: z.number().int().min(0).optional(),
                imageLinks: GoogleImageLinksSchema.optional(),
                industryIdentifiers: z.array(GoogleIndustryIdentifierSchema).optional(),
                categories: z.array(z.string().trim().max(200)).optional(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
  })
  .passthrough();
export type GoogleBooksPayload = z.infer<typeof GoogleBooksPayloadSchema>;

export const BookSearchPageSchema = z
  .object({ books: z.array(BookSearchResultSchema), pageInfo: PageInfoSchema })
  .strict();
export type BookSearchPage = z.infer<typeof BookSearchPageSchema>;

export const VisionOcrResponseSchema = z
  .object({
    text: z.string(),
    imageId: ImageIdSchema,
    bookId: BookIdSchema,
  })
  .strict();
export type VisionOcrResponse = z.infer<typeof VisionOcrResponseSchema>;

export const BookReviewResponseSchema = z
  .object({ success: z.literal(true), draft: z.string(), memosUsed: z.number().int().min(0) })
  .strict();
export type BookReviewResponse = z.infer<typeof BookReviewResponseSchema>;

export const EmbeddingResponseSchema = z
  .object({ success: z.literal(true), embeddingId: RecordIdSchema })
  .strict();
export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

export const KeywordsResponseSchema = z
  .object({ keywords: z.array(z.string().trim().min(1).max(80)).max(8) })
  .strict();
export type KeywordsResponse = z.infer<typeof KeywordsResponseSchema>;

const NoteNodeSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    type: z.enum(["highlight", "note", "photo_ocr"]),
    content: z.string(),
    pageNumber: z.number().int().min(1).optional(),
    sourceId: RecordIdSchema.optional(),
  })
  .strict();

const NoteClusterSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(500),
    summary: z.string(),
    nodes: z.array(NoteNodeSchema),
  })
  .strict();

const NoteConnectionSchema = z
  .object({
    fromNodeId: z.string().trim().min(1).max(200),
    toNodeId: z.string().trim().min(1).max(200),
    reason: z.string(),
  })
  .strict();

export const NoteStructureSchema = z
  .object({
    bookId: BookIdSchema,
    generatedAt: IsoDateSchema,
    clusters: z.array(NoteClusterSchema),
    connections: z.array(NoteConnectionSchema),
  })
  .strict();
export type NoteStructure = z.infer<typeof NoteStructureSchema>;

const ReadingInsightWireSchema = z
  .object({
    id: RecordIdSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string(),
    category: z.enum(["pattern", "milestone", "reflection"]),
    relatedBooks: z.array(z.string().trim().min(1).max(500)),
    generatedAt: IsoDateSchema,
  })
  .strict();

export const ReadingInsightsResponseSchema = z
  .object({ success: z.literal(true), insights: z.array(ReadingInsightWireSchema) })
  .strict();
export type ReadingInsightsResponse = z.infer<typeof ReadingInsightsResponseSchema>;

export const RecallSearchResponseSchema = RecallSearchResultSchema;
export type RecallSearchResponse = z.infer<typeof RecallSearchResponseSchema>;

export const RecallHistoryRowSchema = z
  .object({
    id: RecordIdSchema,
    book_id: BookIdSchema.nullable().optional(),
    query: z.string().trim().min(1).max(500),
    answer: z.string(),
    sources: z.array(RecallSourceSchema),
    created_at: IsoDateSchema,
  })
  .strict();

export const CachedRecommendationSchema = z
  .object({
    id: RecordIdSchema,
    recommendations: RecommendationResultSchema,
    created_at: IsoDateSchema,
  })
  .strict();

export type AdapterBookSearchResult = BookSearchResult;
