import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ChainService } from "./services/chain-service.ts";
import type { NoteStructure } from "./types.ts";
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
  requireOwnedBook,
  requireProviderSecret,
  requireUuid,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";
import { executeThirdPartyAiOperation } from "../_shared/third-party-ai-consent.ts";
import { AiUsageError, withAiBudget } from "../_shared/ai-usage.ts";

const MIN_CONTENT_COUNT = 5;
const MAX_CONTENT_COUNT = 50;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user, authClient } = await requireUser(req);
    const body = await parseJsonBody(req);
    const bookId = requireUuid(body, "bookId") ?? "";
    const serviceClient = createServiceClient();
    await requireOwnedBook(serviceClient, user.id, bookId);
    await requireConsent(serviceClient, user, "ai");
    await enforceFunctionRateLimit(serviceClient, user.id, "structure-notes", 10, 60 * 60);

    const { data: contents, error: fetchError } = await serviceClient
      .from("reading_content_embeddings")
      .select("id, content_type, content_text, page_number, source_id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(MAX_CONTENT_COUNT);
    if (fetchError) throw new Error("content_lookup_failed");
    if (!contents || contents.length < MIN_CONTENT_COUNT) {
      return jsonResponse(
        {
          error: "최소 5개 이상의 독서 기록이 필요합니다",
          code: "insufficient_content",
          currentCount: contents?.length ?? 0,
          requiredCount: MIN_CONTENT_COUNT,
        },
        req,
        400,
      );
    }

    const providerOperation = await executeThirdPartyAiOperation(
      authClient,
      user.id,
      "open_ai",
      () => withAiBudget(
        authClient,
        JSON.stringify(contents).length,
        () => new ChainService(requireProviderSecret("OPENAI_API_KEY")).generateStructure({ bookId, contents }),
        { functionName: "structure-notes", feature: "mindmap", provider: "open_ai", model: "gpt-4o-mini", promptVersion: "structure-v1" },
      ),
    );
    if (!providerOperation.allowed) {
      throw new ContractError(403, "consent_required", "Current OpenAI consent is required");
    }
    const structure: NoteStructure = providerOperation.value;
    const { error: upsertError } = await serviceClient.from("note_structures").upsert(
      {
        user_id: user.id,
        book_id: bookId,
        structure_json: structure,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" },
    );
    if (upsertError) throw new Error("structure_write_failed");
    return jsonResponse(structure as unknown as Record<string, unknown>, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "structure-notes");
    if (error instanceof AiUsageError) return responseForError(new ContractError(error.status, error.code, "AI policy blocked this operation"), req, "structure-notes");
    return responseForError(providerFailure(error), req, "structure-notes");
  }
});
