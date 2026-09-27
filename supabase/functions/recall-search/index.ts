import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ContractError,
  MAX_QUERY_BYTES,
  assertProviderInputSize,
  completeAiRecallQuota,
  createServiceClient,
  consumeAiRecallQuota,
  enforceFunctionRateLimit,
  fetchProvider,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  providerFailure,
  requireConsent,
  requireOwnedBook,
  requireProviderSecret,
  requireString,
  releaseAiRecallQuota,
  requireUuid,
  requireUser,
  responseForError,
  type JsonObject,
} from "../_shared/consumer-contract.ts";

interface SearchRow {
  content_type: string;
  content_text: string;
  page_number: number | null;
  source_id: string | null;
  created_at: string;
  book_id: string;
}

interface SourceDocument {
  type: string;
  content: string;
  pageNumber: number | null;
  sourceId: string | null;
  createdAt: string;
  bookId: string;
  bookTitle: string | null;
}

async function providerJson(
  url: string,
  apiKey: string,
  body: JsonObject,
): Promise<JsonObject> {
  const serializedBody = JSON.stringify(body);
  assertProviderInputSize(serializedBody);
  const response = await fetchProvider(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: serializedBody,
  });
  if (!response.ok) throw new Error(`provider_status:${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("provider_invalid_response");
  }
  return payload as JsonObject;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const payload = await providerJson(
    "https://api.openai.com/v1/embeddings",
    apiKey,
    { model: "text-embedding-3-small", input: text },
  );
  const data = payload.data;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") {
    throw new Error("provider_invalid_response");
  }
  const embedding = (data[0] as Record<string, unknown>).embedding;
  if (!Array.isArray(embedding) || embedding.some((value) => typeof value !== "number")) {
    throw new Error("provider_invalid_response");
  }
  return embedding as number[];
}

async function generateAnswer(
  query: string,
  context: string,
  apiKey: string,
): Promise<string> {
  const payload = await providerJson(
    "https://api.openai.com/v1/chat/completions",
    apiKey,
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "독서 기록을 검색해주는 도우미입니다. 사용자가 직접 남긴 기록만 근거로 답하고, 관련 기록이 없으면 없다고 알려주세요.",
        },
        { role: "user", content: `질문: ${query}\n\n관련 기록:\n${context}` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    },
  );
  const choices = payload.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    throw new Error("provider_invalid_response");
  }
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== "object") throw new Error("provider_invalid_response");
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("provider_invalid_response");
  }
  return content.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  let serviceClient: ReturnType<typeof createServiceClient> | undefined;
  let reservationKey: string | undefined;
  let userId: string | undefined;
  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    userId = user.id;
    const body = await parseJsonBody(req);
    const query = requireString(body, "query", MAX_QUERY_BYTES) ?? "";
    const bookIdValue = body.bookId;
    const bookId = bookIdValue === undefined ? undefined : requireUuid(body, "bookId", false);
    serviceClient = createServiceClient();

    if (bookId) await requireOwnedBook(serviceClient, user.id, bookId);
    await requireConsent(serviceClient, user, "ai");
    await enforceFunctionRateLimit(serviceClient, user.id, "recall-search", 60, 60);
    reservationKey = await consumeAiRecallQuota(serviceClient, user.id);

    const apiKey = requireProviderSecret("OPENAI_API_KEY");
    const queryEmbedding = await generateEmbedding(query, apiKey);
    const { data, error: searchError } = await serviceClient.rpc("match_reading_content", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_count: bookId ? 5 : 10,
      filter_user_id: user.id,
      filter_book_id: bookId ?? null,
    });
    if (searchError) throw new ContractError(503, "unavailable", "Reading data is unavailable");

    const searchResults = (data ?? []) as SearchRow[];
    if (searchResults.length === 0) {
      await completeAiRecallQuota(serviceClient, user.id, reservationKey);
      reservationKey = undefined;
      return jsonResponse(
        { answer: "관련 기록을 찾지 못했습니다. 더 많은 기록을 추가해보세요!", sources: [], ...(bookId ? {} : { sourcesByBook: {} }) },
        req,
      );
    }

    const bookIds = [...new Set(searchResults.map((result) => result.book_id))];
    const { data: books, error: booksError } = await serviceClient
      .from("books")
      .select("id, title")
      .in("id", bookIds)
      .eq("user_id", user.id)
      .is("deleted_at", null);
    if (booksError) throw new ContractError(503, "unavailable", "Reading data is unavailable");

    const bookTitleMap: Record<string, string> = {};
    for (const book of books ?? []) {
      const row = book as { id?: string; title?: string };
      if (row.id && row.title) bookTitleMap[row.id] = row.title;
    }

    const context = searchResults.map((result, index) => {
      const typeLabel = result.content_type === "highlight"
        ? "하이라이트"
        : result.content_type === "note" ? "메모" : "사진 속 텍스트";
      const pageInfo = result.page_number ? ` (${result.page_number}페이지)` : "";
      const bookInfo = !bookId && bookTitleMap[result.book_id]
        ? ` [${bookTitleMap[result.book_id]}]`
        : "";
      return `[${index + 1}] ${typeLabel}${pageInfo}${bookInfo}:\n${result.content_text}`;
    }).join("\n\n");

    const answer = await generateAnswer(query, context, apiKey);
    const sources: SourceDocument[] = searchResults.map((result) => ({
      type: result.content_type,
      content: result.content_text,
      pageNumber: result.page_number,
      sourceId: result.source_id,
      createdAt: result.created_at,
      bookId: result.book_id,
      bookTitle: bookTitleMap[result.book_id] ?? null,
    }));
    const sourcesByBook: Record<string, SourceDocument[]> = {};
    if (!bookId) {
      for (const source of sources) {
        const title = source.bookTitle ?? "Unknown";
        (sourcesByBook[title] ??= []).push(source);
      }
    }

    const { error: historyError } = await serviceClient.from("recall_search_history").insert({
      user_id: user.id,
      book_id: bookId ?? null,
      query,
      answer,
      sources,
    });
    if (historyError) throw new ContractError(503, "unavailable", "Reading data is unavailable");
    await completeAiRecallQuota(serviceClient, user.id, reservationKey);
    reservationKey = undefined;
    return jsonResponse({ answer, sources, ...(bookId ? {} : { sourcesByBook }) }, req);
  } catch (error) {
    if (reservationKey && serviceClient && userId) {
      try {
        await releaseAiRecallQuota(serviceClient, userId, reservationKey);
      } catch (releaseError) {
        console.error("[recall-search] quota release failed", releaseError instanceof Error ? releaseError.message : "unknown error");
      }
    }
    if (error instanceof ContractError) return responseForError(error, req, "recall-search");
    return responseForError(providerFailure(error), req, "recall-search");
  }
});
