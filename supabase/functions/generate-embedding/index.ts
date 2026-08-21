import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type AiUsageLogClient,
  buildAiUsageLog,
  EMBEDDING_MODEL,
  type NormalizedUsage,
  normalizeOpenAiUsage,
  recordAiUsage,
} from "./usage-log.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface EmbeddingRequest {
  userId: string;
  bookId: string;
  contentType: "highlight" | "note" | "photo_ocr";
  contentText: string;
  pageNumber?: number;
  sourceId?: string;
}

interface EmbeddingCallResult {
  embedding: number[];
  usage: NormalizedUsage;
  latencyMs: number;
}

class EmbeddingCallError extends Error {
  constructor(
    readonly errorCode: string,
    readonly latencyMs: number,
    readonly usage: NormalizedUsage,
  ) {
    super("Embedding generation failed");
    this.name = "EmbeddingCallError";
  }
}

function emptyUsage(): NormalizedUsage {
  return { inputTokens: null, outputTokens: null, totalTokens: null };
}

function parseEmbeddingResponse(
  value: unknown,
  latencyMs: number,
): { embedding: number[]; usage: unknown } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new EmbeddingCallError(
      "openai_invalid_response",
      latencyMs,
      emptyUsage(),
    );
  }

  const data = (value as Record<string, unknown>).data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new EmbeddingCallError(
      "openai_invalid_response",
      latencyMs,
      emptyUsage(),
    );
  }

  const first = data[0];
  if (first === null || typeof first !== "object" || Array.isArray(first)) {
    throw new EmbeddingCallError(
      "openai_invalid_response",
      latencyMs,
      emptyUsage(),
    );
  }

  const embedding = (first as Record<string, unknown>).embedding;
  if (
    !Array.isArray(embedding) ||
    !embedding.every((value) =>
      typeof value === "number" && Number.isFinite(value)
    )
  ) {
    throw new EmbeddingCallError(
      "openai_invalid_response",
      latencyMs,
      emptyUsage(),
    );
  }

  return {
    embedding: embedding as number[],
    usage: (value as Record<string, unknown>).usage,
  };
}

async function generateEmbedding(text: string): Promise<EmbeddingCallResult> {
  const startedAt = performance.now();

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    const latencyMs = performance.now() - startedAt;
    if (!response.ok) {
      throw new EmbeddingCallError(
        `openai_http_${response.status}`,
        latencyMs,
        emptyUsage(),
      );
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new EmbeddingCallError(
        "openai_invalid_response",
        performance.now() - startedAt,
        emptyUsage(),
      );
    }

    const parsed = parseEmbeddingResponse(
      responseBody,
      performance.now() - startedAt,
    );
    return {
      embedding: parsed.embedding,
      usage: normalizeOpenAiUsage(parsed.usage),
      latencyMs: performance.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof EmbeddingCallError) {
      throw error;
    }
    throw new EmbeddingCallError(
      "openai_request_failed",
      performance.now() - startedAt,
      emptyUsage(),
    );
  }
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
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const {
      userId,
      bookId,
      contentType,
      contentText,
      pageNumber,
      sourceId,
    }: EmbeddingRequest = await req.json();

    if (!userId || !bookId || !contentType || !contentText) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "userId does not match authenticated user" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    let embeddingResult: EmbeddingCallResult;
    try {
      embeddingResult = await generateEmbedding(contentText);
    } catch (error) {
      const callError = error instanceof EmbeddingCallError
        ? error
        : new EmbeddingCallError(
          "openai_request_failed",
          0,
          emptyUsage(),
        );
      try {
        await recordAiUsage(
          supabaseClient as unknown as AiUsageLogClient,
          buildAiUsageLog({
            userId,
            usage: callError.usage,
            latencyMs: callError.latencyMs,
            status: "failure",
            errorCode: callError.errorCode,
          }),
        );
      } catch {
        throw new Error("AI usage logging failed");
      }
      throw new Error("Embedding generation failed");
    }

    try {
      await recordAiUsage(
        supabaseClient as unknown as AiUsageLogClient,
        buildAiUsageLog({
          userId,
          usage: embeddingResult.usage,
          latencyMs: embeddingResult.latencyMs,
          status: "success",
        }),
      );
    } catch {
      throw new Error("AI usage logging failed");
    }

    const embedding = embeddingResult.embedding;

    const embeddingString = `[${embedding.join(",")}]`;

    const { data, error } = await supabaseClient
      .from("reading_content_embeddings")
      .upsert(
        {
          user_id: userId,
          book_id: bookId,
          content_type: contentType,
          content_text: contentText,
          page_number: pageNumber,
          embedding: embeddingString,
          source_id: sourceId,
        },
        {
          onConflict: "content_type,source_id",
        },
      )
      .select("id")
      .single();

    if (error) {
      throw new Error("Embedding storage failed");
    }

    return new Response(
      JSON.stringify({ success: true, embeddingId: data.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch {
    console.error("Generate embedding request failed");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
