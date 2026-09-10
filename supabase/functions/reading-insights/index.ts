import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "./config.ts";
import type { ReadingInsightResponse } from "./types.ts";
import { PatternCollector } from "./services/pattern-collector.ts";
import { InsightService } from "./services/insight-service.ts";
import {
  ContractError,
  createServiceClient,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  providerFailure,
  requireConsent,
  requireString,
  requireProviderSecret,
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
    if (suppliedUserId !== user.id) {
      throw new ContractError(403, "cross_user_access", "userId does not match authenticated user");
    }

    const serviceClient = createServiceClient();
    await requireConsent(serviceClient, user, "ai");
    requireProviderSecret("OPENAI_API_KEY");
    validateConfig();

    const patternCollector = new PatternCollector(serviceClient);
    const insightService = new InsightService(serviceClient);
    const patterns = await patternCollector.collect(user.id);
    const insights = await insightService.generate(user.id, patterns);
    const response: ReadingInsightResponse = { success: true, insights };
    return jsonResponse(response as unknown as Record<string, unknown>, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "reading-insights");
    if (error instanceof Error && /rate limit exceeded/i.test(error.message)) {
      return responseForError(new ContractError(429, "rate_limited", "Usage limit exceeded"), req, "reading-insights");
    }
    if (error instanceof Error && /(query failed|load failed|save failed|rate limit (check|update) failed)/i.test(error.message)) {
      return responseForError(new ContractError(503, "unavailable", "Reading insights are unavailable"), req, "reading-insights");
    }
    return responseForError(providerFailure(error), req, "reading-insights");
  }
});
