import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ContractError,
  MAX_TEXT_BYTES,
  assertProviderInputSize,
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
  requireProviderSecret,
  requireUuid,
  responseForError,
  requireUser,
} from "../_shared/consumer-contract.ts";

async function extractKeywords(texts: string[], apiKey: string, limit: number): Promise<string[]> {
  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `독서 기록에서 핵심 키워드를 최대 ${limit}개 추출하고 JSON 배열만 반환하세요.` },
      { role: "user", content: texts.join("\n---\n") },
    ],
    temperature: 0.3,
    max_tokens: 200,
  };
  const serializedBody = JSON.stringify(requestBody);
  assertProviderInputSize(serializedBody);
  const response = await fetchProvider("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: serializedBody,
  }, 15_000, 512 * 1024);
  if (!response.ok) throw new Error(`provider_status:${response.status}`);
  const payload: unknown = await response.json();
  const choices = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).choices
    : undefined;
  const message = Array.isArray(choices) && choices[0] && typeof choices[0] === "object"
    ? (choices[0] as Record<string, unknown>).message
    : undefined;
  const content = message && typeof message === "object"
    ? (message as Record<string, unknown>).content
    : undefined;
  if (typeof content !== "string") throw new Error("provider_invalid_response");
  try {
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error("invalid_keywords");
    return parsed
      .filter((keyword): keyword is string => typeof keyword === "string")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length >= 2 && keyword.length <= 40)
      .slice(0, limit);
  } catch {
    return content.match(/["']([^"']+)["']/g)?.map((value) => value.slice(1, -1)).slice(0, limit) ?? [];
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req);
    const bookId = requireUuid(body, "bookId") ?? "";
    const limit = body.limit === undefined ? 8 : requireInteger(body, "limit", 1, 8);
    const serviceClient = createServiceClient();
    await requireOwnedBook(serviceClient, user.id, bookId);
    await requireConsent(serviceClient, user, "ai");
    await enforceFunctionRateLimit(serviceClient, user.id, "extract-keywords", 30, 60);

    const { data: contents, error } = await serviceClient
      .from("reading_content_embeddings")
      .select("content_text")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("content_lookup_failed");
    const texts = (contents ?? [])
      .map((row) => (row as { content_text?: unknown }).content_text)
      .filter((content): content is string => typeof content === "string" && content.length <= MAX_TEXT_BYTES);
    if (texts.length === 0) return jsonResponse({ keywords: [] }, req);

    const keywords = await extractKeywords(texts, requireProviderSecret("OPENAI_API_KEY"), limit);
    return jsonResponse({ keywords }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "extract-keywords");
    return responseForError(providerFailure(error), req, "extract-keywords");
  }
});
