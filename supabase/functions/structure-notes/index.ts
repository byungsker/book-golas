import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { ChainService } from "./services/chain-service.ts";
import type { NoteStructure } from "./types.ts";
import {
  executeThirdPartyAiOperation,
  thirdPartyAiConsentRequiredResponse,
} from "../_shared/third-party-ai-consent.ts";
import {
  aiUsageErrorResponse,
  assertAiInputSize,
  createAiProviderRunner,
} from "../_shared/ai-usage.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MIN_CONTENT_COUNT = 5;
const MAX_CONTENT_COUNT = 50;

interface StructureRequest {
  bookId: string;
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
      console.error("Authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { bookId }: StructureRequest = await req.json();

    if (typeof bookId !== "string" || bookId.trim().length === 0) {
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
    const runAiCall = createAiProviderRunner(
      supabaseClient,
      serviceClient,
      user.id,
    );

    const { data: contents, error: fetchError } = await serviceClient
      .from("reading_content_embeddings")
      .select("id, content_type, content_text, page_number, source_id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(MAX_CONTENT_COUNT);

    if (fetchError) {
      throw fetchError;
    }

    if (!contents || contents.length < MIN_CONTENT_COUNT) {
      return new Response(
        JSON.stringify({
          error: "최소 5개 이상의 독서 기록이 필요합니다",
          currentCount: contents?.length ?? 0,
          requiredCount: MIN_CONTENT_COUNT,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const inputChars = contents.reduce(
      (total, content) => total + content.content_text.length,
      0,
    );
    assertAiInputSize(inputChars);
    const chainService = new ChainService(
      OPENAI_API_KEY,
      runAiCall,
    );
    const structureOperation = await executeThirdPartyAiOperation(
      supabaseClient,
      user.id,
      "open_ai",
      () => chainService.generateStructure({ bookId, contents }),
    );
    if (!structureOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse({
        "Access-Control-Allow-Origin": "*",
      });
    }
    const structure: NoteStructure = structureOperation.value;

    const { error: upsertError } = await serviceClient
      .from("note_structures")
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          structure_json: structure,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,book_id",
        },
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      throw upsertError;
    }

    return new Response(JSON.stringify(structure), {
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
