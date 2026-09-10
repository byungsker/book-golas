import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "./config.ts";
import { ProfileCollector } from "./services/profile-collector.ts";
import { RecommendationService } from "./services/recommendation-service.ts";
import type { RecommendationResponse } from "./types.ts";
import {
  ContractError,
  createServiceClient,
  enforceFunctionRateLimit,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  providerFailure,
  requireConsent,
  requireProviderSecret,
  requireString,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req);
    const suppliedUserId = requireString(body, "userId", 80) ?? "";
    const locale = body.locale === undefined ? "ko" : requireString(body, "locale", 8);
    if (suppliedUserId !== user.id) {
      throw new ContractError(403, "cross_user_access", "userId does not match authenticated user");
    }
    if (locale !== "ko" && locale !== "en") {
      throw new ContractError(400, "invalid_request", "locale must be ko or en");
    }

    const serviceClient = createServiceClient();
    await requireConsent(serviceClient, user, "ai");
    await enforceFunctionRateLimit(serviceClient, user.id, "recommend-next-books", 5, 24 * 60 * 60);
    requireProviderSecret("OPENAI_API_KEY");
    validateConfig();

    const profileCollector = new ProfileCollector(serviceClient);
    const profile = await profileCollector.collect(user.id);
    if (profile.books.length === 0) {
      return jsonResponse({
        success: false,
        error: "No completed books found",
        recommendations: [],
        profile: { stats: profile.stats, booksAnalyzed: 0 },
      }, req);
    }

    const recommendationService = new RecommendationService(locale);
    const recommendations = await recommendationService.generate(profile);
    const response: RecommendationResponse = {
      success: true,
      recommendations,
      profile: { stats: profile.stats, booksAnalyzed: profile.books.length },
    };
    const { error: saveError } = await serviceClient.from("book_recommendations").insert({
      user_id: user.id,
      recommendations: response.recommendations,
      profile_summary: response.profile,
    });
    if (saveError) throw new Error("recommendation_write_failed");
    return jsonResponse(response as unknown as Record<string, unknown>, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "recommend-next-books");
    return responseForError(providerFailure(error), req, "recommend-next-books");
  }
});
