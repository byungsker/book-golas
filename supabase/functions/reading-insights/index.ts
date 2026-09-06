import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { config, validateConfig } from "./config.ts";
import type { ReadingInsightResponse } from "./types.ts";
import { PatternCollector } from "./services/pattern-collector.ts";
import { InsightService } from "./services/insight-service.ts";
import {
  executeThirdPartyAiOperation,
  thirdPartyAiConsentRequiredResponse,
} from "../_shared/third-party-ai-consent.ts";
import {
  aiUsageErrorResponse,
  createAiProviderRunner,
} from "../_shared/ai-usage.ts";
import { requestIdFromRequest } from "../_shared/edge-http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    validateConfig();

    const authHeader = req.headers.get("Authorization");
    const authClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "userId does not match authenticated user" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
    );
    const requestId = requestIdFromRequest(req);
    const runAiCall = createAiProviderRunner(
      authClient,
      supabase,
      user.id,
      requestId,
    );

    const patternCollector = new PatternCollector(supabase);
    const insightService = new InsightService(
      supabase,
      runAiCall,
    );

    const patterns = await patternCollector.collect(userId);
    const insightOperation = await executeThirdPartyAiOperation(
      authClient,
      user.id,
      "open_ai",
      () => insightService.generate(userId, patterns),
    );
    if (!insightOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse(corsHeaders);
    }
    const insights = insightOperation.value;
    const response: ReadingInsightResponse = {
      success: true,
      insights,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const usageResponse = aiUsageErrorResponse(error, corsHeaders);
    if (usageResponse) return usageResponse;
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("[reading-insights] Error:", errorMessage);

    const isRateLimitError = errorMessage.includes("Rate limit exceeded");
    const status = isRateLimitError ? 429 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
