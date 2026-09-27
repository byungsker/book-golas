import "server-only";

import {
  AiMindMapSchema,
  AiRecommendationsSchema,
  AiInsightsSchema,
  BookIdSchema,
  IsoDateSchema,
  RecordIdSchema,
  type AiArtifactKind,
  type AiInsights,
  type AiMindMap,
  type AiRecommendations,
  type BookId,
} from "@/lib/product/contracts";
import { resolveProductSession, type ProductClientFactory, type ProductSession } from "./context";
import {
  failure,
  mapDatabaseError,
  success,
  unavailableError,
  type ProductResult,
} from "./errors";

export type AiArtifactRead =
  | {
      readonly kind: "mindmap";
      readonly cacheState: "fresh" | "missing" | "expired";
      readonly artifact: AiMindMap | null;
      readonly createdAt: string | null;
    }
  | {
      readonly kind: "insights";
      readonly cacheState: "fresh" | "missing" | "expired";
      readonly artifact: AiInsights | null;
      readonly createdAt: string | null;
    }
  | {
      readonly kind: "recommendations";
      readonly cacheState: "fresh" | "missing" | "expired";
      readonly artifact: AiRecommendations | null;
      readonly createdAt: string | null;
    };

export type AiArtifactTableOptions = Readonly<{
  factory?: ProductClientFactory;
  now?: Date;
}>;

function readDate(value: unknown): string | null {
  const parsed = IsoDateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isAfter(left: string, right: string): boolean {
  return new Date(left).getTime() > new Date(right).getTime();
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function sessionFor(options: AiArtifactTableOptions): Promise<ProductResult<ProductSession>> {
  return resolveProductSession(options.factory);
}

async function latestSourceUpdatedAt(
  session: ProductSession,
  bookId?: BookId,
): Promise<ProductResult<string | null>> {
  try {
    let booksQuery = session.supabase
      .from("books")
      .select("updated_at")
      .eq("user_id", session.userId)
      .is("deleted_at", null);
    if (bookId) booksQuery = booksQuery.eq("id", bookId);
    const booksResult = bookId
      ? await booksQuery.maybeSingle()
      : await booksQuery.order("updated_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (booksResult.error) return failure(mapDatabaseError(booksResult.error));

    let embeddingsQuery = session.supabase
      .from("reading_content_embeddings")
      .select("created_at")
      .eq("user_id", session.userId);
    if (bookId) embeddingsQuery = embeddingsQuery.eq("book_id", bookId);
    const embeddingsResult = await embeddingsQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (embeddingsResult.error) return failure(mapDatabaseError(embeddingsResult.error));

    let progressQuery = session.supabase
      .from("reading_progress_history")
      .select("created_at")
      .eq("user_id", session.userId);
    if (bookId) progressQuery = progressQuery.eq("book_id", bookId);
    const progressResult = await progressQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (progressResult.error) return failure(mapDatabaseError(progressResult.error));

    const timestamps = [
      readDate(readRecord(booksResult.data)?.updated_at),
      readDate(readRecord(embeddingsResult.data)?.created_at),
      readDate(readRecord(progressResult.data)?.created_at),
    ].filter((value): value is string => value !== null);
    return success(timestamps.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

async function ownedBookTitles(session: ProductSession): Promise<ProductResult<Map<string, BookId>>> {
  try {
    const { data, error } = await session.supabase
      .from("books")
      .select("id,title")
      .eq("user_id", session.userId)
      .is("deleted_at", null);
    if (error) return failure(mapDatabaseError(error));
    const titles = new Map<string, BookId>();
    for (const row of Array.isArray(data) ? data : []) {
      const record = readRecord(row);
      const id = BookIdSchema.safeParse(record?.id);
      const title = typeof record?.title === "string" ? record.title.trim().toLocaleLowerCase() : "";
      if (id.success && title) titles.set(title, id.data);
    }
    return success(titles);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

async function normalizeCachedInsights(
  session: ProductSession,
  row: Record<string, unknown>,
  createdAt: string,
): Promise<ProductResult<AiInsights>> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(typeof row.insight_content === "string" ? row.insight_content : "");
  } catch {
    return failure(unavailableError("Saved reading insights are malformed."));
  }
  if (!Array.isArray(decoded)) return failure(unavailableError("Saved reading insights are malformed."));

  const references = decoded.flatMap((item) => {
    const record = readRecord(item);
    return Array.isArray(record?.relatedBooks) ? record.relatedBooks : [];
  });
  const titles = references.length > 0
    ? await ownedBookTitles(session)
    : success(new Map<string, BookId>());
  if (!titles.ok) return failure(titles.error);
  const ownedIds = new Set(titles.value.values());
  const rowId = typeof row.id === "string" ? row.id : null;

  const insights = decoded.map((item) => {
    const record = readRecord(item);
    const relatedBooks = Array.isArray(record?.relatedBooks)
      ? record.relatedBooks.map((value) => {
          const parsedId = BookIdSchema.safeParse(value);
          if (parsedId.success) return ownedIds.has(parsedId.data) ? parsedId.data : "";
          return typeof value === "string" ? titles.value.get(value.trim().toLocaleLowerCase()) ?? "" : "";
        })
      : [];
    return {
      id: RecordIdSchema.safeParse(record?.id).success ? record?.id : rowId,
      title: record?.title,
      description: record?.description,
      category: record?.category,
      relatedBooks,
      generatedAt: readDate(record?.generatedAt) ?? createdAt,
    };
  });

  const parsed = AiInsightsSchema.safeParse(insights);
  return parsed.success ? success(parsed.data) : failure(unavailableError("Saved reading insights are malformed."));
}

function cacheExpired(
  createdAt: string,
  expiresAt: string | null,
  sourceUpdatedAt: string | null,
  now: Date,
): boolean {
  if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) return true;
  return sourceUpdatedAt !== null && isAfter(sourceUpdatedAt, createdAt);
}

export async function readMindMapArtifact(
  bookId: string,
  options: AiArtifactTableOptions = {},
): Promise<ProductResult<AiArtifactRead & { kind: "mindmap" }>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(unavailableError("The mind map book is invalid."));
  const session = await sessionFor(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("note_structures")
      .select("structure_json,created_at,updated_at")
      .eq("user_id", session.value.userId)
      .eq("book_id", parsedBookId.data)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    if (!data || typeof data !== "object") {
      return success({ kind: "mindmap", cacheState: "missing", artifact: null, createdAt: null });
    }
    const record = readRecord(data);
    const artifact = AiMindMapSchema.safeParse(record?.structure_json);
    const createdAt = readDate(record?.updated_at) ?? (artifact.success ? artifact.data.generatedAt : readDate(record?.created_at));
    if (!artifact.success || artifact.data.bookId !== parsedBookId.data || !createdAt) {
      return failure(unavailableError("Saved mind map is malformed."));
    }
    const sourceUpdatedAt = await latestSourceUpdatedAt(session.value, parsedBookId.data);
    if (!sourceUpdatedAt.ok) return failure(sourceUpdatedAt.error);
    const expired = cacheExpired(createdAt, null, sourceUpdatedAt.value, options.now ?? new Date());
    return success({
      kind: "mindmap",
      cacheState: expired ? "expired" : "fresh",
      artifact: expired ? null : artifact.data,
      createdAt,
    });
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function readReadingInsightsArtifact(
  options: AiArtifactTableOptions = {},
): Promise<ProductResult<AiArtifactRead & { kind: "insights" }>> {
  const session = await sessionFor(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("reading_insights_memory")
      .select("id,insight_content,insight_metadata,created_at,expires_at")
      .eq("user_id", session.value.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    if (!data || typeof data !== "object") {
      return success({ kind: "insights", cacheState: "missing", artifact: null, createdAt: null });
    }
    const record = readRecord(data);
    const createdAt = readDate(record?.created_at);
    if (!createdAt) return failure(unavailableError("Saved reading insights are malformed."));
    const expiresAt = readDate(record?.expires_at);
    const artifact = await normalizeCachedInsights(session.value, record ?? {}, createdAt);
    if (!artifact.ok) return failure(artifact.error);
    const sourceUpdatedAt = await latestSourceUpdatedAt(session.value);
    if (!sourceUpdatedAt.ok) return failure(sourceUpdatedAt.error);
    const expired = cacheExpired(createdAt, expiresAt, sourceUpdatedAt.value, options.now ?? new Date());
    return success({
      kind: "insights",
      cacheState: expired ? "expired" : "fresh",
      artifact: expired ? null : artifact.value,
      createdAt,
    });
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function readRecommendationsArtifact(
  options: AiArtifactTableOptions = {},
): Promise<ProductResult<AiArtifactRead & { kind: "recommendations" }>> {
  const session = await sessionFor(options);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("book_recommendations")
      .select("id,recommendations,profile_summary,created_at,expires_at")
      .eq("user_id", session.value.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    if (!data || typeof data !== "object") {
      return success({ kind: "recommendations", cacheState: "missing", artifact: null, createdAt: null });
    }
    const record = readRecord(data);
    const createdAt = readDate(record?.created_at);
    const expiresAt = readDate(record?.expires_at);
    const artifact = AiRecommendationsSchema.safeParse({
      success: true,
      recommendations: record?.recommendations,
      profile: record?.profile_summary,
    });
    if (!createdAt || !artifact.success) return failure(unavailableError("Saved recommendations are malformed."));
    const sourceUpdatedAt = await latestSourceUpdatedAt(session.value);
    if (!sourceUpdatedAt.ok) return failure(sourceUpdatedAt.error);
    const expired = cacheExpired(createdAt, expiresAt, sourceUpdatedAt.value, options.now ?? new Date());
    return success({
      kind: "recommendations",
      cacheState: expired ? "expired" : "fresh",
      artifact: expired ? null : artifact.data,
      createdAt,
    });
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function readAiArtifact(
  input: { kind: "mindmap"; bookId: string } | { kind: "insights" } | { kind: "recommendations" },
  options: AiArtifactTableOptions = {},
): Promise<ProductResult<AiArtifactRead>> {
  if (input.kind === "mindmap") return readMindMapArtifact(input.bookId, options);
  if (input.kind === "insights") return readReadingInsightsArtifact(options);
  return readRecommendationsArtifact(options);
}

export function isAiArtifactKind(value: string): value is AiArtifactKind {
  return value === "mindmap" || value === "insights" || value === "recommendations";
}
