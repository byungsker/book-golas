import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

import {
  executeThirdPartyAiOperation,
  thirdPartyAiConsentRequiredResponse,
} from "../_shared/third-party-ai-consent.ts";
import {
  aiUsageErrorResponse,
  consumeAiBudget,
  fetchAiProvider,
} from "../_shared/ai-usage.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface ReviewRequest {
  bookId: string;
}

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function generateReviewWithGPT(
  book: BookData,
  memos: MemoContent[],
): Promise<string> {
  const memoTexts = memos.length > 0
    ? memos
      .map(
        (m, i) =>
          `[메모 ${i + 1}${
            m.page_number ? ` (p.${m.page_number})` : ""
          }]\n${m.content_text}`,
      )
      .join("\n\n")
    : "기록된 메모가 없습니다.";

  const bookInfo = [
    `제목: ${book.title}`,
    book.author ? `저자: ${book.author}` : null,
    book.genre ? `장르: ${book.genre}` : null,
    book.rating ? `별점: ${book.rating}/5` : null,
    book.review ? `한줄평: ${book.review}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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
          {
            role: "system",
            content:
              `당신은 독서 기록을 바탕으로 진솔하고 개인적인 독후감 초안을 작성하는 도우미입니다.

작성 가이드라인:
- 사용자의 메모와 기록을 바탕으로 자연스러운 독후감 초안 작성
- 1인칭 시점으로 작성 ("나는", "내가", "나에게" 등)
- 책의 내용 요약보다 독자의 감상과 통찰에 집중
- 메모가 있다면 그 내용을 자연스럽게 녹여서 작성
- 메모가 없어도 책 정보(제목, 저자, 장르, 별점, 한줄평)를 바탕으로 일반적인 독후감 틀 제공
- 분량: 300-500자 내외
- 마무리는 열린 형태로 (사용자가 추가할 수 있도록)
- 마크다운이나 특수 서식 없이 일반 텍스트로 작성`,
          },
          {
            role: "user",
            content: `다음 책에 대한 독후감 초안을 작성해주세요.

=== 책 정보 ===
${bookInfo}

=== 독서 중 기록한 메모 ===
${memoTexts}

위 정보를 바탕으로 자연스러운 독후감 초안을 작성해주세요.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`,
    );
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { bookId }: ReviewRequest = await req.json();

    if (!bookId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: bookId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

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

    const { data: book, error: bookError } = await serviceClient
      .from("books")
      .select("title, author, genre, rating, review")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return new Response(
        JSON.stringify({ error: "Book not found or access denied" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: memos } = await serviceClient
      .from("reading_content_embeddings")
      .select("content_text, page_number")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: true })
      .limit(15);

    console.log(
      `[generate-book-review] Generating review for book: ${book.title}, memos: ${
        memos?.length ?? 0
      }`,
    );

    const inputChars = [
      book.title,
      book.author,
      book.genre,
      book.review,
      ...(memos ?? []).map((memo) => memo.content_text),
    ]
      .filter((value): value is string => typeof value === "string")
      .reduce((total, value) => total + value.length, 0);
    if (inputChars > 20_000) {
      return new Response(JSON.stringify({ error: "input_too_large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const reviewOperation = await executeThirdPartyAiOperation(
      supabaseClient,
      user.id,
      "open_ai",
      async () => {
        await consumeAiBudget(supabaseClient, inputChars);
        return generateReviewWithGPT(
          book as BookData,
          (memos as MemoContent[]) ?? [],
        );
      },
    );
    if (!reviewOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse(corsHeaders);
    }
    const reviewDraft = reviewOperation.value;

    return new Response(
      JSON.stringify({
        success: true,
        draft: reviewDraft,
        memosUsed: memos?.length ?? 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    const usageResponse = aiUsageErrorResponse(error, corsHeaders);
    if (usageResponse) return usageResponse;
    console.error("[generate-book-review] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
