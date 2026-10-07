import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { UserReadingProfile } from "../types.ts";
import {
  THIRD_PARTY_AI_POLICY_VERSION,
} from "../../_shared/third-party-ai-consent.ts";
import type {
  AiBudgetContext,
  AiProviderOperation,
} from "../../_shared/ai-usage.ts";
import { collectProfileWithConsent } from "./profile-consent.ts";

function consentClient(receipt: Record<string, unknown> | null): unknown {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: receipt, error: null }),
          }),
        }),
      }),
    }),
  };
}

const profile: UserReadingProfile = {
  userId: "user-a",
  books: [],
  stats: {
    totalBooksCompleted: 0,
    averageRating: 0,
    favoriteGenres: [],
    averageCompletionDays: 0,
    highEngagementBookCount: 0,
  },
  interests: { topHighlights: [], keywords: [] },
};

Deno.test(
  "recommendation profile collection does not call providers without consent",
  async () => {
    let collectionCalls = 0;
    let providerCalls = 0;
    const profileCollector = {
      collect: async () => {
        collectionCalls += 1;
        await (async () => {
          providerCalls += 1;
        })();
        return profile;
      },
    };

    const result = await collectProfileWithConsent(
      consentClient(null),
      "user-a",
      profileCollector,
      async <T>(
        _input: string,
        _context: AiBudgetContext,
        operation: AiProviderOperation<T>,
      ) => (await operation()).value,
    );

    assertEquals(result, { allowed: false });
    assertEquals(collectionCalls, 0);
    assertEquals(providerCalls, 0);
  },
);

Deno.test(
  "recommendation profile collection runs only after current consent",
  async () => {
    let collectionCalls = 0;
    let providerCalls = 0;
    const profileCollector = {
      collect: async (
        _userId: string,
        runProviderCall: <T>(
          input: string,
          context: AiBudgetContext,
          operation: AiProviderOperation<T>,
        ) => Promise<T>,
      ) => {
        collectionCalls += 1;
        await runProviderCall(
          "interest query",
          {
            functionName: "recommend-next-books",
            feature: "recommend-next-books.interest-embedding",
            provider: "open_ai",
            model: "text-embedding-3-small",
            promptVersion: "test-v1",
            maxOutputTokens: 0,
            requireOutputTokens: false,
          },
          async () => ({
            value: true,
            usage: { input_tokens: 1, output_tokens: 0, total_tokens: 1 },
          }),
        );
        providerCalls += 1;
        return profile;
      },
    };

    const result = await collectProfileWithConsent(
      consentClient({
        granted: true,
        policy_version: THIRD_PARTY_AI_POLICY_VERSION,
      }),
      "user-a",
      profileCollector,
      async <T>(
        _input: string,
        _context: AiBudgetContext,
        operation: AiProviderOperation<T>,
      ) => (await operation()).value,
    );

    assertEquals(result, { allowed: true, value: profile });
    assertEquals(collectionCalls, 1);
    assertEquals(providerCalls, 1);
  },
);
