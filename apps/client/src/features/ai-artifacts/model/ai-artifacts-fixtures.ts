import type {
  AiArtifactGenerateRequest,
  AiArtifactReadResponse,
  AiInsights,
  AiMindMap,
  AiRecommendations,
  AiArtifactKind,
} from "../api/ai-artifacts-contracts";
import type { BookId, RecordId } from "@/shared/api/contracts";
import {
  budgetExceededError,
  concurrencyExceededError,
  consentRequiredError,
  consentStatusUnknownError,
  failure,
  hardCapExceededError,
  notFoundError,
  offlineError,
  providerError,
  providerTimeoutError,
  quotaExceededError,
  rateLimitExceededError,
  success,
  unauthorizedError,
  unavailableError,
  type ProductError,
  type ProductResult,
} from "@/shared/api/product/errors";

export const aiArtifactsFixtureBookId = "00000000-0000-4000-8000-000000004421" as BookId;
const insightId = "00000000-0000-4000-8000-000000004422" as RecordId;
const noteId = "00000000-0000-4000-8000-000000004423" as RecordId;
const generatedAt = "2026-09-15T00:00:00.000Z";

const mindMap: AiMindMap = {
  bookId: aiArtifactsFixtureBookId,
  generatedAt,
  clusters: [
    {
      id: "cluster-attention",
      name: "Attention",
      summary: "Ideas that connect attention and deliberate practice.",
      nodes: [
        { id: "node-highlight", type: "highlight", content: "Attention is a practice.", pageNumber: 12, sourceId: noteId },
        { id: "node-note", type: "note", content: "Return to this idea during the next session.", pageNumber: 18 },
      ],
    },
  ],
  connections: [
    { fromNodeId: "node-highlight", toNodeId: "node-note", reason: "The memo extends the highlighted idea." },
  ],
};

const insights: AiInsights = [
  {
    id: insightId,
    title: "A steadier rhythm",
    description: "You completed three books while keeping a regular reading pace.",
    category: "pattern",
    relatedBooks: [aiArtifactsFixtureBookId],
    generatedAt,
  },
];

const recommendations: AiRecommendations = {
  success: true,
  recommendations: [
    {
      title: "The Reading Atlas",
      author: "Mina Park",
      reason: "A reflective next step after your recent reading rhythm.",
      keywords: ["attention", "essay"],
      imageUrl: null,
    },
  ],
  profile: {
    stats: {
      totalBooksCompleted: 3,
      averageRating: 4.5,
      favoriteGenres: [{ genre: "essay", count: 2 }],
      averageCompletionDays: 12,
      highEngagementBookCount: 1,
    },
    booksAnalyzed: 3,
  },
};

const emptyRecommendations: AiRecommendations = {
  success: false,
  recommendations: [],
  profile: {
    stats: {
      totalBooksCompleted: 0,
      averageRating: 0,
      favoriteGenres: [],
      averageCompletionDays: 0,
      highEngagementBookCount: 0,
    },
    booksAnalyzed: 0,
  },
  error: "No completed books found",
};

const errorByFixture: Record<string, ProductError> = {
  "ai-artifacts-unauthorized": unauthorizedError(),
  "ai-artifacts-consent": consentRequiredError("AI consent is required for this artifact."),
  "ai-artifacts-consent-withdrawn": consentRequiredError("OpenAI consent was withdrawn."),
  "ai-artifacts-consent-unknown": consentStatusUnknownError("OpenAI consent could not be confirmed."),
  "ai-artifacts-consent-unavailable": unavailableError("OpenAI consent verification is unavailable."),
  "ai-artifacts-quota": quotaExceededError("AI quota has been reached for this period."),
  "ai-artifacts-rate-limit": rateLimitExceededError("This artifact can be generated again later."),
  "ai-artifacts-concurrency": concurrencyExceededError("The maximum number of AI requests is running."),
  "ai-artifacts-budget": budgetExceededError("The operational AI budget was reached."),
  "ai-artifacts-hard-cap": hardCapExceededError("The AI safety cap was reached."),
  "ai-artifacts-timeout": providerTimeoutError("The AI provider timed out."),
  "ai-artifacts-provider": providerError("The AI provider is unavailable."),
  "ai-artifacts-offline": offlineError("AI artifacts are offline."),
  "ai-artifacts-foreign": notFoundError(),
};

const generatedByRequestKey = new Map<string, AiArtifactReadResponse["artifact"]>();
const providerCallsByFixture = new Map<string, number>();

function artifactFor(kind: AiArtifactKind, empty: boolean): AiArtifactReadResponse["artifact"] {
  if (kind === "mindmap") return empty ? { ...mindMap, clusters: [], connections: [] } : mindMap;
  if (kind === "insights") return empty ? [] : insights;
  return empty ? emptyRecommendations : recommendations;
}

function readResponse(kind: AiArtifactKind, cacheState: "fresh" | "missing" | "expired", empty = false): AiArtifactReadResponse {
  return {
    kind,
    cacheState,
    artifact: cacheState === "fresh" ? artifactFor(kind, empty) : null,
    createdAt: cacheState === "missing" ? null : generatedAt,
  } as AiArtifactReadResponse;
}

export function resetAiArtifactsFixtures() {
  generatedByRequestKey.clear();
  providerCallsByFixture.clear();
}

export function getAiArtifactsFixtureProviderCalls(fixture: string): number {
  return providerCallsByFixture.get(fixture) ?? 0;
}

export function getAiArtifactsFixtureRead(input: {
  fixture: string;
  kind: AiArtifactKind;
}): ProductResult<AiArtifactReadResponse> {
  const error = errorByFixture[input.fixture];
  if (error) return failure(error);
  if (input.fixture === "ai-artifacts-missing") return success(readResponse(input.kind, "missing"));
  if (input.fixture === "ai-artifacts-expired" || input.fixture === "ai-artifacts-source-changed") return success(readResponse(input.kind, "expired"));
  return success(readResponse(input.kind, "fresh", input.fixture === "ai-artifacts-empty"));
}

export function getAiArtifactsFixtureGenerate(
  input: AiArtifactGenerateRequest,
  fixture: string,
): ProductResult<AiArtifactReadResponse> {
  const error = errorByFixture[fixture];
  if (error) return failure(error);
  if (fixture === "ai-artifacts-foreign") return failure(notFoundError());
  const artifactScope = input.kind === "mindmap" ? input.bookId : "account";
  const scopedRequestKey = `${fixture}:${input.kind}:${artifactScope}:${input.requestKey}`;
  const existing = generatedByRequestKey.get(scopedRequestKey);
  const artifact = existing ?? artifactFor(input.kind, false);
  if (existing === undefined) {
    generatedByRequestKey.set(scopedRequestKey, artifact);
    providerCallsByFixture.set(fixture, getAiArtifactsFixtureProviderCalls(fixture) + 1);
  }
  return success({
    kind: input.kind,
    cacheState: fixture === "ai-artifacts-expired" || fixture === "ai-artifacts-source-changed" ? "expired" : "missing",
    artifact,
    createdAt: generatedAt,
  } as AiArtifactReadResponse);
}
