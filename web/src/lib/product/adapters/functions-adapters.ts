import "server-only";

import { z } from "zod";
import {
  BookIdSchema,
  ExportReadingDataRequestSchema,
  ExportReadingDataResultSchema,
  ImageIdSchema,
  InsightSchema,
  RecallSearchResultSchema,
  RecallSourceSchema,
  RecommendationResultSchema,
  RecordIdSchema,
  type Insight,
  type RecallSearchResult,
  type RecallSource,
  type RecommendationResult,
  type ExportReadingDataRequest,
  type ExportReadingDataResult,
} from "@/lib/product/contracts";
import {
  failure,
  forbiddenError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  resolveProductSession,
  type ProductSession,
} from "@/lib/product/dal/context";
import {
  BookReviewResponseSchema,
  EmbeddingResponseSchema,
  KeywordsResponseSchema,
  NoteStructureSchema,
  ReadingInsightsResponseSchema,
  VisionOcrResponseSchema,
  type BookReviewResponse,
  type EmbeddingResponse,
  type KeywordsResponse,
  type NoteStructure,
  type ReadingInsightsResponse,
  type VisionOcrResponse,
} from "./contracts";
import {
  invokeProductFunctionForSession,
  type ProductFunctionOptions,
} from "./functions";

export type AdapterOptions = ProductFunctionOptions;

const RecallWireSchema = z
  .object({
    answer: z.string(),
    sources: z.array(RecallSourceSchema),
    sourcesByBook: z.record(z.string(), z.array(RecallSourceSchema)).optional(),
  })
  .strict();

export type EmbeddingInput = Readonly<{
  bookId: string;
  contentType: "highlight" | "note" | "photo_ocr";
  contentText: string;
  pageNumber?: number;
  sourceId: string;
}>;

export type OcrInput = Readonly<{
  bookId: string;
  imageId: string;
  imageBase64: string;
}>;

async function invokeForSession<T>(
  functionName: string,
  body: Record<string, unknown>,
  schema: import("zod").ZodType<T>,
  options: AdapterOptions = {},
): Promise<ProductResult<T>> {
  const session = await resolveProductSession(options.factory);
  if (!session.ok) return failure(session.error);
  return invokeProductFunctionForSession(session.value, functionName, body, schema, options);
}

export async function generateBookReview(
  bookId: string,
  options: AdapterOptions = {},
): Promise<ProductResult<BookReviewResponse>> {
  if (!BookIdSchema.safeParse(bookId).success) return failure(validationError());
  return invokeForSession("generate-book-review", { bookId }, BookReviewResponseSchema, options);
}

export async function generateEmbedding(
  input: EmbeddingInput,
  options: AdapterOptions = {},
): Promise<ProductResult<EmbeddingResponse>> {
  const parsedBookId = BookIdSchema.safeParse(input.bookId);
  if (
    !parsedBookId.success ||
    !new Set(["highlight", "note", "photo_ocr"]).has(input.contentType) ||
    input.contentText.trim().length === 0 ||
    input.contentText.length > 20_000 ||
    !RecordIdSchema.safeParse(input.sourceId).success ||
    (input.pageNumber !== undefined && (!Number.isInteger(input.pageNumber) || input.pageNumber < 0))
  ) {
    return failure(validationError());
  }
  const session = await resolveProductSession(options.factory);
  if (!session.ok) return failure(session.error);
  return invokeProductFunctionForSession(
    session.value,
    "generate-embedding",
    {
      // The Edge Function still accepts this field for backwards compatibility;
      // it is always derived from the verified session and never from the caller.
      userId: session.value.userId,
      bookId: parsedBookId.data,
      contentType: input.contentType,
      contentText: input.contentText,
      ...(input.pageNumber === undefined ? {} : { pageNumber: input.pageNumber }),
      sourceId: input.sourceId,
    },
    EmbeddingResponseSchema,
    options,
  );
}

export async function extractKeywords(
  bookId: string,
  options: AdapterOptions = {},
): Promise<ProductResult<KeywordsResponse>> {
  if (!BookIdSchema.safeParse(bookId).success) return failure(validationError());
  return invokeForSession("extract-keywords", { bookId }, KeywordsResponseSchema, options);
}

export async function structureNotes(
  bookId: string,
  options: AdapterOptions = {},
): Promise<ProductResult<NoteStructure>> {
  if (!BookIdSchema.safeParse(bookId).success) return failure(validationError());
  return invokeForSession("structure-notes", { bookId }, NoteStructureSchema, options);
}

export async function runVisionOcr(
  input: OcrInput,
  options: AdapterOptions = {},
): Promise<ProductResult<VisionOcrResponse>> {
  if (
    !BookIdSchema.safeParse(input.bookId).success ||
    !ImageIdSchema.safeParse(input.imageId).success ||
    input.imageBase64.trim().length === 0
  ) {
    return failure(validationError());
  }
  return invokeForSession("vision-ocr", { ...input }, VisionOcrResponseSchema, options);
}

export async function exportReadingData(
  input: ExportReadingDataRequest,
  options: AdapterOptions = {},
): Promise<ProductResult<ExportReadingDataResult>> {
  const parsed = ExportReadingDataRequestSchema.safeParse(input);
  if (!parsed.success) return failure(validationError());

  const session = await resolveProductSession(options.factory);
  if (!session.ok) return failure(session.error);

  const authenticatedEmail = session.value.user.email?.trim();
  if (!authenticatedEmail || authenticatedEmail.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return failure(forbiddenError("The export email must match the authenticated account."));
  }

  return invokeProductFunctionForSession(
    session.value,
    "export-reading-data",
    parsed.data,
    ExportReadingDataResultSchema,
    options,
  );
}

export function normalizeRecallResponse(value: unknown): ProductResult<RecallSearchResult> {
  const parsed = RecallWireSchema.safeParse(value);
  if (!parsed.success) return failure(unavailableError("recall-search returned an invalid response."));

  const sourceGroups: Record<string, RecallSource[]> = {};
  for (const [rawKey, sources] of Object.entries(parsed.data.sourcesByBook ?? {})) {
    const keyFromPayload = BookIdSchema.safeParse(rawKey);
    if (keyFromPayload.success) {
      sourceGroups[keyFromPayload.data] = sources;
      continue;
    }
    for (const source of sources) {
      const sourceBookId = source.bookId && BookIdSchema.safeParse(source.bookId);
      if (!sourceBookId || !sourceBookId.success) {
        return failure(unavailableError("recall-search returned an invalid book grouping."));
      }
      (sourceGroups[sourceBookId.data] ??= []).push(source);
    }
  }

  const candidate = {
    answer: parsed.data.answer,
    sources: parsed.data.sources,
    ...(Object.keys(sourceGroups).length > 0 ? { sourcesByBook: sourceGroups } : {}),
  };
  const normalized = RecallSearchResultSchema.safeParse(candidate);
  return normalized.success
    ? success(normalized.data)
    : failure(unavailableError("recall-search returned an invalid response."));
}

export async function searchRecall(
  input: Readonly<{ query: string; locale: "ko" | "en"; bookId?: string }>,
  options: AdapterOptions = {},
): Promise<ProductResult<RecallSearchResult>> {
  if (
    (input.locale !== "ko" && input.locale !== "en") ||
    input.query.trim().length === 0 ||
    input.query.length > 500 ||
    (input.bookId !== undefined && !BookIdSchema.safeParse(input.bookId).success)
  ) {
    return failure(validationError());
  }
  const wire = await invokeForSession(
    "recall-search",
    {
      query: input.query,
      locale: input.locale,
      ...(input.bookId === undefined ? {} : { bookId: input.bookId }),
    },
    RecallWireSchema,
    options,
  );
  if (!wire.ok) return failure(wire.error);
  return normalizeRecallResponse(wire.value);
}

async function normalizeInsights(
  response: ReadingInsightsResponse,
  options: AdapterOptions,
  verifiedSession?: ProductSession,
): Promise<ProductResult<Insight[]>> {
  const references = response.insights.flatMap((insight) => insight.relatedBooks);
  const titleMap = new Map<string, string>();
  const ownedIds = new Set<string>();

  if (references.length > 0) {
    let session: ProductSession;
    if (verifiedSession) {
      session = verifiedSession;
    } else {
      const resolved = await resolveProductSession(options.factory);
      if (!resolved.ok) return failure(resolved.error);
      session = resolved.value;
    }
    try {
      const { data, error } = await session.supabase
        .from("books")
        .select("id,title")
        .eq("user_id", session.userId)
        .is("deleted_at", null);
      if (error) return failure(unavailableError("Reading insights could not resolve book references."));
      for (const row of Array.isArray(data) ? data : []) {
        if (typeof row.id === "string" && typeof row.title === "string") {
          ownedIds.add(row.id);
          titleMap.set(row.title.trim().toLocaleLowerCase(), row.id);
        }
      }
    } catch {
      return failure(unavailableError("Reading insights could not resolve book references."));
    }
  }

  const normalized = response.insights.map((insight) => ({
    id: insight.id,
    title: insight.title,
    description: insight.description,
    category: insight.category,
    relatedBooks: insight.relatedBooks.map((reference) => {
      const parsedId = BookIdSchema.safeParse(reference);
      if (parsedId.success) return parsedId.data;
      return titleMap.get(reference.trim().toLocaleLowerCase()) ?? "";
    }),
    generatedAt: insight.generatedAt,
  }));

  if (normalized.some((insight) => insight.relatedBooks.some((bookId) => bookId.length === 0))) {
    return failure(unavailableError("Reading insights returned an unknown book reference."));
  }
  if (normalized.some((insight) => insight.relatedBooks.some((bookId) => !ownedIds.has(bookId)))) {
    return failure(unavailableError("Reading insights returned an invalid book reference."));
  }

  const parsed = normalized.map((insight) => InsightSchema.safeParse(insight));
  return parsed.every((item) => item.success)
    ? success(parsed.map((item) => item.data as Insight))
    : failure(unavailableError("reading-insights returned an invalid response."));
}

export async function generateReadingInsights(
  localeOrOptions: "ko" | "en" | AdapterOptions = "ko",
  maybeOptions: AdapterOptions = {},
): Promise<ProductResult<Insight[]>> {
  const locale = typeof localeOrOptions === "string" ? localeOrOptions : "ko";
  const options = typeof localeOrOptions === "string" ? maybeOptions : localeOrOptions;
  if (locale !== "ko" && locale !== "en") return failure(validationError());
  const session = await resolveProductSession(options.factory);
  if (!session.ok) return failure(session.error);
  const wire = await invokeProductFunctionForSession(
    session.value,
    "reading-insights",
    { userId: session.value.userId, locale },
    ReadingInsightsResponseSchema,
    options,
  );
  if (!wire.ok) return failure(wire.error);
  return normalizeInsights(wire.value, options, session.value);
}

export async function recommendNextBooks(
  locale: "ko" | "en",
  options: AdapterOptions = {},
): Promise<ProductResult<RecommendationResult>> {
  const session = await resolveProductSession(options.factory);
  if (!session.ok) return failure(session.error);
  return invokeProductFunctionForSession(
    session.value,
    "recommend-next-books",
    { userId: session.value.userId, locale },
    RecommendationResultSchema,
    options,
  );
}
