import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ContractError,
  MAX_TEXT_BYTES,
  createServiceClient,
  enforceFunctionRateLimit,
  fetchProvider,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  providerFailure,
  requireConsent,
  requireInteger,
  requireOwnedBook,
  requireOwnedSourceForWrite,
  requireProviderSecret,
  requireString,
  requireUuid,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

const contentTypes = new Set(["highlight", "note", "photo_ocr"]);

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetchProvider("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  }, 15_000, 512 * 1024);
  if (!response.ok) throw new Error(`provider_status:${response.status}`);
  const payload: unknown = await response.json();
  const rows = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).data
    : undefined;
  const embedding = Array.isArray(rows) && rows[0] && typeof rows[0] === "object"
    ? (rows[0] as Record<string, unknown>).embedding
    : undefined;
  if (!Array.isArray(embedding) || embedding.some((value) => typeof value !== "number")) {
    throw new Error("provider_invalid_response");
  }
  return embedding as number[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req);
    const suppliedUserId = requireString(body, "userId", 80) ?? "";
    const bookId = requireUuid(body, "bookId") ?? "";
    const contentType = requireString(body, "contentType", 32) ?? "";
    const contentText = requireString(body, "contentText", MAX_TEXT_BYTES) ?? "";
    const sourceId = body.sourceId === undefined || body.sourceId === null
      ? undefined
      : requireUuid(body, "sourceId");
    if (suppliedUserId !== user.id) {
      throw new ContractError(403, "cross_user_access", "userId does not match authenticated user");
    }
    if (!contentTypes.has(contentType)) {
      throw new ContractError(400, "invalid_request", "contentType is invalid");
    }
    if (contentType !== "note" && !sourceId) {
      throw new ContractError(400, "invalid_request", "sourceId is required");
    }
    const pageNumber = body.pageNumber === undefined
      ? undefined
      : requireInteger(body, "pageNumber", 0, 100_000);
    const serviceClient = createServiceClient();
    await requireOwnedBook(serviceClient, user.id, bookId);
    if (sourceId) {
      await requireOwnedSourceForWrite(serviceClient, user.id, bookId, contentType, sourceId);
    }
    await requireConsent(serviceClient, user, "ai");
    await enforceFunctionRateLimit(serviceClient, user.id, "generate-embedding", 120, 60);

    const embedding = await generateEmbedding(contentText, requireProviderSecret("OPENAI_API_KEY"));
    const { data, error } = await serviceClient.from("reading_content_embeddings").upsert(
      {
        user_id: user.id,
        book_id: bookId,
        content_type: contentType,
        content_text: contentText,
        page_number: pageNumber,
        embedding: `[${embedding.join(",")}]`,
        source_id: sourceId ?? null,
      },
      { onConflict: "content_type,source_id" },
    ).select("id").single();
    if (error || !data) throw new Error("embedding_write_failed");
    return jsonResponse({ success: true, embeddingId: data.id }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "generate-embedding");
    return responseForError(providerFailure(error), req, "generate-embedding");
  }
});
