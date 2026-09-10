import {
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2";
import { ContractError } from "./consumer-errors.ts";

export async function requireOwnedBook(
  serviceClient: SupabaseClient,
  userId: string,
  bookId: string,
): Promise<void> {
  const { data, error } = await serviceClient
    .from("books")
    .select("id, user_id, deleted_at")
    .eq("id", bookId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    throw new ContractError(503, "unavailable", "Ownership verification is unavailable");
  }
  if (!data) {
    throw new ContractError(403, "cross_user_access", "The requested book is not owned by the authenticated user");
  }
}

type BookImageSource = {
  id?: unknown;
  user_id?: unknown;
  book_id?: unknown;
  highlights?: unknown;
};

function isOwnedBookImage(row: BookImageSource, userId: string, bookId: string): boolean {
  return row.book_id === bookId && (row.user_id === null || row.user_id === undefined || row.user_id === userId);
}

function containsHighlight(row: BookImageSource, sourceId: string): boolean {
  if (!Array.isArray(row.highlights)) return false;
  return row.highlights.some((highlight) => (
    highlight !== null
    && typeof highlight === "object"
    && (highlight as Record<string, unknown>).id === sourceId
  ));
}

export async function requireOwnedSourceForWrite(
  serviceClient: SupabaseClient,
  userId: string,
  bookId: string,
  contentType: string,
  sourceId: string,
): Promise<void> {
  const { data: embedding, error: embeddingError } = await serviceClient
    .from("reading_content_embeddings")
    .select("user_id, book_id")
    .eq("content_type", contentType)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (embeddingError) {
    throw new ContractError(503, "unavailable", "Source verification is unavailable");
  }
  if (embedding) {
    if (embedding.user_id !== userId || embedding.book_id !== bookId) {
      throw new ContractError(403, "cross_user_access", "The requested source is already owned by another book or user");
    }
    return;
  }

  if (contentType === "note") {
    const { data: image, error: imageError } = await serviceClient
      .from("book_images")
      .select("id, user_id, book_id")
      .eq("id", sourceId)
      .maybeSingle();
    if (imageError) {
      throw new ContractError(503, "unavailable", "Source verification is unavailable");
    }
    if (image && !isOwnedBookImage(image, userId, bookId)) {
      throw new ContractError(403, "cross_user_access", "The requested source is already owned by another book or user");
    }
    return;
  }

  const { data: image, error: imageError } = await serviceClient
    .from("book_images")
    .select("id, user_id, book_id")
    .eq("id", sourceId)
    .maybeSingle();
  if (imageError) {
    throw new ContractError(503, "unavailable", "Source verification is unavailable");
  }
  if (image && !isOwnedBookImage(image, userId, bookId)) {
    throw new ContractError(403, "cross_user_access", "The requested source is already owned by another book or user");
  }
  if (contentType === "photo_ocr") {
    if (!image) {
      throw new ContractError(403, "cross_user_access", "The requested source is not owned by the authenticated user");
    }
    return;
  }

  if (contentType === "highlight") {
    const { data: images, error: imagesError } = await serviceClient
      .from("book_images")
      .select("id, user_id, book_id, highlights")
      .eq("book_id", bookId);
    if (imagesError) {
      throw new ContractError(503, "unavailable", "Source verification is unavailable");
    }
    if ((images ?? []).some((row) => isOwnedBookImage(row, userId, bookId) && containsHighlight(row, sourceId))) {
      return;
    }
  }

  throw new ContractError(403, "cross_user_access", "The requested source is not owned by the authenticated user");
}

export async function requireOwnedSource(
  serviceClient: SupabaseClient,
  userId: string,
  bookId: string,
  sourceId: string,
): Promise<void> {
  const { data: embedding, error: embeddingError } = await serviceClient
    .from("reading_content_embeddings")
    .select("id")
    .eq("id", sourceId)
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (embeddingError) {
    throw new ContractError(503, "unavailable", "Source verification is unavailable");
  }
  if (embedding) return;

  const { data: image, error: imageError } = await serviceClient
    .from("book_images")
    .select("id, user_id")
    .eq("id", sourceId)
    .eq("book_id", bookId)
    .maybeSingle();
  if (imageError) {
    throw new ContractError(503, "unavailable", "Source verification is unavailable");
  }
  if (!image || (image.user_id !== null && image.user_id !== userId)) {
    throw new ContractError(403, "cross_user_access", "The requested source is not owned by the authenticated user");
  }
}

type ConsentKind = "ai" | "ocr" | "camera" | "share" | "notifications";

export async function requireConsent(
  serviceClient: SupabaseClient,
  user: User,
  kind: ConsentKind,
): Promise<void> {
  const { data, error } = await serviceClient
    .from("user_consents")
    .select("status, version")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .maybeSingle();
  if (error) {
    throw new ContractError(503, "unavailable", "Consent verification is unavailable");
  }
  if (!data || data.status !== "granted" || typeof data.version !== "string" || data.version.length === 0) {
    throw new ContractError(403, "consent_required", `${kind} consent is required`);
  }
}

export async function consumeAiRecallQuota(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<string> {
  const reservationKey = crypto.randomUUID();
  const { data, error } = await serviceClient.rpc("consume_ai_recall_quota", {
    p_user_id: userId,
    p_reservation_key: reservationKey,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    throw new ContractError(503, "unavailable", "Usage policy is unavailable");
  }
  const result = data[0] as { allowed?: boolean; reset_at?: string };
  if (result.allowed !== true) {
    throw new ContractError(429, "quota_exceeded", "AI Recall monthly quota exceeded", {
      resetAt: result.reset_at ?? null,
    });
  }
  return reservationKey;
}

export async function completeAiRecallQuota(
  serviceClient: SupabaseClient,
  userId: string,
  reservationKey: string,
): Promise<void> {
  const { error } = await serviceClient.rpc("complete_ai_recall_quota", {
    p_user_id: userId,
    p_reservation_key: reservationKey,
  });
  if (error) throw new ContractError(503, "unavailable", "Usage policy is unavailable");
}

export async function releaseAiRecallQuota(
  serviceClient: SupabaseClient,
  userId: string,
  reservationKey: string,
): Promise<void> {
  const { error } = await serviceClient.rpc("release_ai_recall_quota", {
    p_user_id: userId,
    p_reservation_key: reservationKey,
  });
  if (error) throw new ContractError(503, "unavailable", "Usage policy is unavailable");
}

export async function enforceFunctionRateLimit(
  serviceClient: SupabaseClient,
  userId: string,
  functionName: string,
  limit: number,
  windowSeconds: number,
  failureCode: "rate_limited" | "quota_exceeded" = "rate_limited",
): Promise<void> {
  const { data, error } = await serviceClient.rpc("consume_edge_function_budget", {
    p_user_id: userId,
    p_function_name: functionName,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    throw new ContractError(503, "unavailable", "Usage policy is unavailable");
  }
  const result = data[0] as { allowed?: boolean; reset_at?: string };
  if (result.allowed !== true) {
    throw new ContractError(429, failureCode, "Usage limit exceeded", {
      resetAt: result.reset_at ?? null,
    });
  }
}
