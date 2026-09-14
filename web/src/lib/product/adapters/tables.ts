import "server-only";

import {
  BookIdSchema,
  ImageSchema,
  RecallSearchHistorySchema,
  RecommendationResultSchema,
  type Image,
  type RecallSearchHistory,
} from "@/lib/product/contracts";
import {
  failure,
  notFoundError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  resolveProductSession,
  type ProductClientFactory,
} from "@/lib/product/dal/context";
import {
  CachedRecommendationSchema,
  NoteStructureSchema,
  RecallHistoryRowSchema,
  type NoteStructure,
} from "./contracts";
import { mapAdapterError } from "./errors";

export type TableOptions = Readonly<{ factory?: ProductClientFactory }>;

async function resolveTableSession(options: TableOptions) {
  return resolveProductSession(options.factory);
}

export type ListRecallHistoryOptions = TableOptions & Readonly<{ limit?: number }>;

export async function listRecallHistory(
  options: ListRecallHistoryOptions = {},
): Promise<ProductResult<RecallSearchHistory[]>> {
  const limit = options.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return failure(validationError());
  const session = await resolveTableSession(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("recall_search_history")
      .select("id,query,answer,sources,created_at")
      .eq("user_id", session.value.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return failure(mapAdapterError(error));

    const history: RecallSearchHistory[] = [];
    for (const row of Array.isArray(data) ? data : []) {
      const parsed = RecallHistoryRowSchema.safeParse(row);
      if (!parsed.success) return failure(unavailableError("Recall history is malformed."));
      const item = RecallSearchHistorySchema.safeParse({
        id: parsed.data.id,
        query: parsed.data.query,
        answer: parsed.data.answer,
        sources: parsed.data.sources,
        createdAt: parsed.data.created_at,
      });
      if (!item.success) return failure(unavailableError("Recall history is invalid."));
      history.push(item.data);
    }
    return success(history);
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function getNoteStructure(
  bookId: string,
  options: TableOptions = {},
): Promise<ProductResult<NoteStructure>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError());
  const session = await resolveTableSession(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("note_structures")
      .select("structure_json")
      .eq("user_id", session.value.userId)
      .eq("book_id", parsedBookId.data)
      .maybeSingle();
    if (error) return failure(mapAdapterError(error));
    if (!data || typeof data.structure_json !== "object" || data.structure_json === null) {
      return failure(notFoundError());
    }
    const structure = NoteStructureSchema.safeParse(data.structure_json);
    return structure.success && structure.data.bookId === parsedBookId.data
      ? success(structure.data)
      : failure(unavailableError("The saved note structure is malformed."));
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function listOwnedBookImages(
  bookId: string,
  options: TableOptions = {},
): Promise<ProductResult<Image[]>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError());
  const session = await resolveTableSession(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("book_images")
      .select("id,book_id,image_url,caption,page_number")
      .eq("user_id", session.value.userId)
      .eq("book_id", parsedBookId.data)
      .order("created_at", { ascending: false });
    if (error) return failure(mapAdapterError(error));

    const images: Image[] = [];
    for (const row of Array.isArray(data) ? data : []) {
      const parsed = ImageSchema.safeParse({
        id: row.id,
        bookId: row.book_id,
        imageUrl: row.image_url,
        caption: row.caption ?? null,
        pageNumber: row.page_number ?? null,
      });
      if (!parsed.success) return failure(unavailableError("Book image metadata is malformed."));
      images.push(parsed.data);
    }
    return success(images);
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export type RecommendationCache = Readonly<{
  id: string;
  result: import("@/lib/product/contracts").RecommendationResult;
  createdAt: string;
}>;

export async function getLatestRecommendation(
  options: TableOptions = {},
): Promise<ProductResult<RecommendationCache>> {
  const session = await resolveTableSession(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("book_recommendations")
      .select("id,recommendations,profile_summary,created_at")
      .eq("user_id", session.value.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return failure(mapAdapterError(error));
    if (!data) return failure(notFoundError());

    const parsed = CachedRecommendationSchema.safeParse({
      id: data.id,
      recommendations: data.recommendations,
      created_at: data.created_at,
    });
    if (parsed.success) {
      return success({ id: parsed.data.id, result: parsed.data.recommendations, createdAt: parsed.data.created_at });
    }

    const recommendations = Array.isArray(data.recommendations) ? data.recommendations : undefined;
    const id = typeof data.id === "string" ? data.id : undefined;
    const createdAt = typeof data.created_at === "string" ? data.created_at : undefined;
    if (!id || !createdAt) return failure(unavailableError("Saved recommendations are malformed."));
    const result = RecommendationResultSchema.safeParse({
      success: true,
      recommendations,
      profile: data.profile_summary,
    });
    if (!result.success) return failure(unavailableError("Saved recommendations are malformed."));
    return success({ id, result: result.data, createdAt });
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export type ConsentRecord = Readonly<{
  kind: "ai" | "notifications" | "camera" | "share" | "ocr";
  status: "granted" | "denied";
  version: string;
}>;

export async function getConsent(
  kind: ConsentRecord["kind"],
  options: TableOptions = {},
): Promise<ProductResult<ConsentRecord | null>> {
  const session = await resolveTableSession(options);
  if (!session.ok) return failure(session.error);
  try {
    const { data, error } = await session.value.supabase
      .from("user_consents")
      .select("kind,status,version")
      .eq("user_id", session.value.userId)
      .eq("kind", kind)
      .maybeSingle();
    if (error) return failure(mapAdapterError(error));
    if (!data) return success(null);
    if (
      data.kind !== kind ||
      (data.status !== "granted" && data.status !== "denied") ||
      typeof data.version !== "string" ||
      data.version.trim().length === 0
    ) {
      return failure(unavailableError("Consent data is malformed."));
    }
    return success({ kind, status: data.status, version: data.version });
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function invokeProductRpc<T>(
  rpcName: string,
  params: Record<string, unknown>,
  schema: import("zod").ZodType<T>,
  options: TableOptions = {},
): Promise<ProductResult<T>> {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(rpcName)) return failure(validationError());
  if ("user_id" in params || "userId" in params || "p_user_id" in params) {
    return failure(validationError("RPC ownership is derived from the authenticated session."));
  }
  const session = await resolveTableSession(options);
  if (!session.ok) return failure(session.error);
  try {
    const { data, error } = await session.value.supabase.rpc(rpcName, params);
    if (error) return failure(mapAdapterError(error));
    const parsed = schema.safeParse(data);
    return parsed.success ? success(parsed.data) : failure(unavailableError(`${rpcName} returned invalid data.`));
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export const readRecallHistory = listRecallHistory;
export const readNoteStructure = getNoteStructure;
export const readBookImages = listOwnedBookImages;
