import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

import {
  executeThirdPartyAiOperation,
  thirdPartyAiConsentRequiredResponse,
} from "../_shared/third-party-ai-consent.ts";
import {
  aiUsageErrorResponse,
  fetchAiProvider,
  withAiBudget,
} from "../_shared/ai-usage.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface SearchRequest {
  bookId?: string;
  query: string;
}

interface SourceDocument {
  type: string;
  content: string;
  pageNumber: number | null;
  sourceId: string | null;
  createdAt: string;
  bookId: string | null;
  bookTitle: string | null;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetchAiProvider(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================
// AI 응답 스타일 설정 (TONE CONFIGURATION)
// 말투를 조정하려면 이 상수들을 수정하세요.
// ============================================================
const TONE_CONFIG = {
  // 사용자 호칭: "회원님", "" (생략), "독자님" 등
  userAddress: "",

  // 말투 스타일 가이드
  styleGuide: `
- 친근하고 부드러운 ~요 체를 사용해요 (예: "기록하셨어요", "인상깊으셨나봐요")
- "당신"이라는 표현은 사용하지 않아요
- 공감하는 느낌으로 답변해요 (예: "이 부분이 특히 와닿으셨군요!")
- 너무 길게 설명하지 않고 핵심만 전달해요`,

  // 예시 표현들 (AI가 참고할 표현)
  examplePhrases: [
    "하이라이트하신 부분을 보면~",
    "메모하신 내용 중에~",
    "이런 부분을 기록해두셨어요",
    "~라고 적어두셨네요",
    "이 부분이 인상깊으셨나봐요!",
  ],
};

async function generateAnswer(
  query: string,
  context: string,
): Promise<string> {
  const systemPrompt = `독서 기록을 검색해주는 AI 도우미예요.
사용자가 직접 하이라이트하거나 메모한 내용만을 기반으로 답변해요.
책의 일반적인 내용이 아닌, '사용자가 중요하게 본 부분'을 알려줘요.

${TONE_CONFIG.styleGuide}

답변 형식:
- 페이지 번호가 있으면 자연스럽게 언급해요 (예: "23페이지에서~")
- 참고할 표현들: ${TONE_CONFIG.examplePhrases.join(", ")}
- 관련 기록이 없으면 "관련 기록을 찾지 못했어요. 더 많은 기록을 남겨보세요!"라고 답변해요`;

  const userPrompt = `질문: ${query}

관련 기록:
${context}`;

  const response = await fetchAiProvider(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { bookId, query }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing required field: query" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (query.length > 2_000) {
      return new Response(JSON.stringify({ error: "input_too_large" }), {
        status: 413,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const isGlobalSearch = !bookId;

    const embeddingOperation = await executeThirdPartyAiOperation(
      supabaseClient,
      user.id,
      "open_ai",
      async () => {
        return withAiBudget(
          supabaseClient,
          query.length,
          () => generateEmbedding(query),
        );
      },
    );
    if (!embeddingOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse({
        "Access-Control-Allow-Origin": "*",
      });
    }
    const queryEmbedding = embeddingOperation.value;
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: searchResults, error: searchError } = await serviceClient.rpc(
      "match_reading_content",
      {
        query_embedding: embeddingString,
        match_count: isGlobalSearch ? 10 : 5,
        filter_user_id: user.id,
        filter_book_id: isGlobalSearch ? null : bookId,
      },
    );

    if (searchError) {
      throw searchError;
    }

    if (!searchResults || searchResults.length === 0) {
      const emptyResponse: any = {
        answer:
          "관련 기록을 찾지 못했습니다. 더 많은 하이라이트나 메모를 추가해보세요!",
        sources: [],
      };
      if (isGlobalSearch) {
        emptyResponse.sourcesByBook = {};
      }
      return new Response(JSON.stringify(emptyResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const uniqueBookIds = [
      ...new Set(searchResults.map((r: any) => r.book_id)),
    ];
    const bookTitleMap: Record<string, string> = {};

    if (uniqueBookIds.length > 0) {
      const { data: books } = await serviceClient
        .from("books")
        .select("id, title")
        .in("id", uniqueBookIds);

      if (books) {
        for (const book of books) {
          bookTitleMap[book.id] = book.title;
        }
      }
    }

    const context = searchResults
      .map((result: any, index: number) => {
        const typeLabel = result.content_type === "highlight"
          ? "하이라이트"
          : result.content_type === "note"
          ? "메모"
          : "사진 속 텍스트";
        const pageInfo = result.page_number
          ? ` (${result.page_number}페이지)`
          : "";
        const bookInfo = isGlobalSearch && bookTitleMap[result.book_id]
          ? ` [${bookTitleMap[result.book_id]}]`
          : "";
        return `[${
          index + 1
        }] ${typeLabel}${pageInfo}${bookInfo}:\n${result.content_text}`;
      })
      .join("\n\n");

    const answerInputChars = query.length + context.length;
    if (answerInputChars > 20_000) {
      return new Response(JSON.stringify({ error: "input_too_large" }), {
        status: 413,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const answerOperation = await executeThirdPartyAiOperation(
      supabaseClient,
      user.id,
      "open_ai",
      async () => {
        return withAiBudget(
          supabaseClient,
          answerInputChars,
          () => generateAnswer(query, context),
        );
      },
    );
    if (!answerOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse({
        "Access-Control-Allow-Origin": "*",
      });
    }
    const answer = answerOperation.value;

    const sources: SourceDocument[] = searchResults.map((result: any) => ({
      type: result.content_type,
      content: result.content_text,
      pageNumber: result.page_number,
      sourceId: result.source_id,
      createdAt: result.created_at,
      bookId: result.book_id,
      bookTitle: bookTitleMap[result.book_id] || null,
    }));

    const sourcesByBook: Record<string, SourceDocument[]> = {};
    if (isGlobalSearch) {
      for (const source of sources) {
        const title = source.bookTitle || "Unknown";
        if (!sourcesByBook[title]) {
          sourcesByBook[title] = [];
        }
        sourcesByBook[title].push(source);
      }
    }

    await serviceClient.from("recall_search_history").insert({
      user_id: user.id,
      book_id: isGlobalSearch ? null : bookId,
      query: query,
      answer: answer,
      sources: sources,
    });

    const responseBody: any = {
      answer,
      sources,
    };
    if (isGlobalSearch) {
      responseBody.sourcesByBook = sourcesByBook;
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const usageResponse = aiUsageErrorResponse(error, {
      "Access-Control-Allow-Origin": "*",
    });
    if (usageResponse) return usageResponse;
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
