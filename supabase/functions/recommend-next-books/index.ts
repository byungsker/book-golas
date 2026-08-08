import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { config, validateConfig } from "./config.ts";
import { ProfileCollector } from "./services/profile-collector.ts";
import { RecommendationService } from "./services/recommendation-service.ts";
import type { RecommendationResponse } from "./types.ts";
import {
  executeThirdPartyAiOperation,
  thirdPartyAiConsentRequiredResponse,
} from "../_shared/third-party-ai-consent.ts";
import { aiUsageErrorResponse, consumeAiBudget } from "../_shared/ai-usage.ts";

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

    const { userId, locale = "ko" } = await req.json();
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

    console.log(
      `[recommend-next-books] Collecting profile for user: ${userId}`,
    );
    const profileCollector = new ProfileCollector(supabase);
    const profile = await profileCollector.collect(
      userId,
      (prompt) => consumeAiBudget(authClient, prompt.length),
    );

    if (profile.books.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No completed books found",
          recommendations: [],
          profile: { stats: profile.stats, booksAnalyzed: 0 },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log(
      `[recommend-next-books] Generating recommendations (locale: ${locale})...`,
    );
    const recommendationService = new RecommendationService(
      locale,
      (prompt) => consumeAiBudget(authClient, prompt.length),
    );
    const recommendationOperation = await executeThirdPartyAiOperation(
      authClient,
      user.id,
      "open_ai",
      () => recommendationService.generate(profile),
    );
    if (!recommendationOperation.allowed) {
      return thirdPartyAiConsentRequiredResponse(corsHeaders);
    }
    const recommendations = recommendationOperation.value;

    const response: RecommendationResponse = {
      success: true,
      recommendations,
      profile: {
        stats: profile.stats,
        booksAnalyzed: profile.books.length,
      },
    };

    const { error: saveError } = await supabase
      .from("book_recommendations")
      .insert({
        user_id: userId,
        recommendations: response.recommendations,
        profile_summary: response.profile,
      });
    if (saveError) {
      console.error(
        "[recommend-next-books] Failed to save recommendations:",
        saveError,
      );
    }

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
    console.error("[recommend-next-books] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
