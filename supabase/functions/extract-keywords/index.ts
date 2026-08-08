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

interface KeywordRequest {
  bookId: string;
  limit?: number;
}

async function extractKeywordsWithGPT(texts: string[]): Promise<string[]> {
  const combinedText = texts.join("\n---\n");

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
            content: `당신은 텍스트에서 핵심 키워드를 추출하는 전문가입니다.
주어진 독서 기록들에서 가장 의미있는 핵심 명사/키워드를 추출하세요.

규칙:
- 한 단어 또는 두 단어 조합의 키워드만 추출
- 일반적인 단어(것, 수, 등, 때, 곳 등)는 제외
- 책의 핵심 개념이나 주제를 나타내는 단어 우선
- 최대 8개까지만 추출
- JSON 배열 형식으로만 응답 (예: ["습관", "목표", "성장"])`,
          },
          {
            role: "user",
            content:
              `다음 독서 기록들에서 핵심 키워드를 추출해주세요:\n\n${combinedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  try {
    const keywords = JSON.parse(content);
    if (Array.isArray(keywords)) {
      return keywords.filter((k: string) =>
        k && k.length >= 2 && k.length <= 10
      );
    }
  } catch {
    const matches = content.match(/["']([^"']+)["']/g);
    if (matches) {
      return matches.map((m: string) => m.replace(/["']/g, "")).slice(0, 8);
    }
  }

  return [];
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

    const { bookId, limit = 8 }: KeywordRequest = await req.json();

    if (!bookId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: bookId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
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

    const { data: contents, error: fetchError } = await serviceClient
      .from("reading_content_embeddings")
      .select("content_text")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) {
      throw fetchError;
    }

    if (!contents || contents.length === 0) {
      return new Response(JSON.stringify({ keywords: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const texts = contents.map((c: { content_text: string }) => c.content_text);
    const inputChars = texts.reduce((total, text) => total + text.length, 0);
    if (inputChars > 20_000) {
      return new Response(JSON.stringify({ error: "input_too_large" }), {
        status: 413,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    const keywordOperation = await executeThirdPartyAiOperation(
      supabaseClient,
      user.id,
      "open_ai",
      async () => {
        return withAiBudget(
          supabaseClient,
          inputChars,
          () => extractKeywordsWithGPT(texts),
        );
      },
    );
    if (!keywordOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse({
        "Access-Control-Allow-Origin": "*",
      });
    }
    const keywords = keywordOperation.value;
    const limitedKeywords = keywords.slice(0, limit);

    return new Response(JSON.stringify({ keywords: limitedKeywords }), {
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
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
