import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ContractError,
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
  requireOwnedBook,
  requireProviderSecret,
  requireUuid,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

interface BookData {
  title: string;
  author: string | null;
  genre: string | null;
  rating: number | null;
  review: string | null;
}

interface MemoContent {
  content_text: string;
  page_number: number | null;
}

async function generateReviewWithGPT(
  book: BookData,
  memos: MemoContent[],
  apiKey: string,
): Promise<string> {
  const memoTexts = memos.length > 0
    ? memos.map((memo, index) => `[메모 ${index + 1}${memo.page_number ? ` (p.${memo.page_number})` : ""}]\n${memo.content_text}`).join("\n\n")
    : "기록된 메모가 없습니다.";
  const bookInfo = [
    `제목: ${book.title}`,
    book.author ? `저자: ${book.author}` : null,
    book.genre ? `장르: ${book.genre}` : null,
    book.rating ? `별점: ${book.rating}/5` : null,
    book.review ? `한줄평: ${book.review}` : null,
  ].filter((value): value is string => Boolean(value)).join("\n");
  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "사용자의 독서 기록을 바탕으로 300~500자 분량의 1인칭 독후감 초안을 작성하세요. 마크다운 없이 일반 텍스트로 답하세요.",
      },
      { role: "user", content: `책 정보:\n${bookInfo}\n\n독서 기록:\n${memoTexts}` },
    ],
    temperature: 0.7,
    max_tokens: 1000,
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
  if (typeof content !== "string" || content.trim().length === 0) throw new Error("provider_invalid_response");
  return content.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req);
    const bookId = requireUuid(body, "bookId") ?? "";
    const serviceClient = createServiceClient();
    await requireOwnedBook(serviceClient, user.id, bookId);
    await requireConsent(serviceClient, user, "ai");
    await enforceFunctionRateLimit(serviceClient, user.id, "generate-book-review", 10, 60 * 60);

    const { data: book, error: bookError } = await serviceClient
      .from("books")
      .select("title, author, genre, rating, review")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (bookError || !book) throw new ContractError(403, "cross_user_access", "The requested book is not owned by the authenticated user");

    const { data: memos, error: memoError } = await serviceClient
      .from("reading_content_embeddings")
      .select("content_text, page_number")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: true })
      .limit(15);
    if (memoError) throw new Error("content_lookup_failed");

    const draft = await generateReviewWithGPT(
      book as BookData,
      (memos ?? []) as MemoContent[],
      requireProviderSecret("OPENAI_API_KEY"),
    );
    return jsonResponse({ success: true, draft, memosUsed: memos?.length ?? 0 }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "generate-book-review");
    return responseForError(providerFailure(error), req, "generate-book-review");
  }
});
