import { describe, expect, it, beforeEach } from "vitest";
import { AiArtifactGenerateRequestSchema } from "@/lib/product/contracts";
import { getAiArtifactsFixtureGenerate, getAiArtifactsFixtureProviderCalls, getAiArtifactsFixtureRead, resetAiArtifactsFixtures } from "./ai-artifacts-fixtures";

const request = AiArtifactGenerateRequestSchema.parse({
  kind: "mindmap",
  bookId: "00000000-0000-4000-8000-000000004421",
  locale: "en",
  requestKey: "00000000-0000-4000-8000-000000004499",
});

describe("AI artifact fixtures", () => {
  beforeEach(() => resetAiArtifactsFixtures());

  it("models fresh, missing, expired and empty artifacts", () => {
    expect(getAiArtifactsFixtureRead({ fixture: "ai-artifacts-happy", kind: "mindmap" })).toMatchObject({ ok: true, value: { cacheState: "fresh", artifact: { clusters: expect.any(Array) } } });
    expect(getAiArtifactsFixtureRead({ fixture: "ai-artifacts-missing", kind: "mindmap" })).toMatchObject({ ok: true, value: { cacheState: "missing", artifact: null } });
    expect(getAiArtifactsFixtureRead({ fixture: "ai-artifacts-expired", kind: "insights" })).toMatchObject({ ok: true, value: { cacheState: "expired", artifact: null } });
    expect(getAiArtifactsFixtureRead({ fixture: "ai-artifacts-empty", kind: "recommendations" })).toMatchObject({ ok: true, value: { cacheState: "fresh", artifact: { recommendations: [] } } });
  });

  it("keeps consent, policy, provider, transport and owner failures typed", () => {
    for (const [fixture, code] of [
      ["ai-artifacts-consent", "consent_required"],
      ["ai-artifacts-consent-withdrawn", "consent_required"],
      ["ai-artifacts-consent-unknown", "consent_status_unknown"],
      ["ai-artifacts-consent-unavailable", "unavailable"],
      ["ai-artifacts-quota", "quota_exceeded"],
      ["ai-artifacts-rate-limit", "rate_limit_exceeded"],
      ["ai-artifacts-concurrency", "concurrency_exceeded"],
      ["ai-artifacts-budget", "budget_exceeded"],
      ["ai-artifacts-hard-cap", "hard_cap_exceeded"],
      ["ai-artifacts-timeout", "provider_timeout"],
      ["ai-artifacts-provider", "provider_error"],
      ["ai-artifacts-offline", "offline"],
      ["ai-artifacts-unauthorized", "unauthorized"],
      ["ai-artifacts-foreign", "not_found"],
    ] as const) {
      expect(getAiArtifactsFixtureRead({ fixture, kind: "insights" })).toMatchObject({ ok: false, error: { code } });
      expect(getAiArtifactsFixtureProviderCalls(fixture)).toBe(0);
    }
  });

  it("returns one result for a replayed request key", () => {
    const first = getAiArtifactsFixtureGenerate(request, "ai-artifacts-missing");
    const replay = getAiArtifactsFixtureGenerate(request, "ai-artifacts-missing");
    expect(first).toEqual(replay);
    expect(getAiArtifactsFixtureProviderCalls("ai-artifacts-missing")).toBe(1);
  });

  it("scopes idempotency to the artifact identity", () => {
    const insightRequest = AiArtifactGenerateRequestSchema.parse({
      kind: "insights",
      locale: "en",
      requestKey: request.requestKey,
    });
    const recommendationRequest = AiArtifactGenerateRequestSchema.parse({
      kind: "recommendations",
      locale: "en",
      requestKey: request.requestKey,
    });

    expect(getAiArtifactsFixtureGenerate(insightRequest, "ai-artifacts-source-changed")).toMatchObject({
      ok: true,
      value: { kind: "insights", artifact: expect.any(Array) },
    });
    expect(getAiArtifactsFixtureGenerate(recommendationRequest, "ai-artifacts-source-changed")).toMatchObject({
      ok: true,
      value: { kind: "recommendations", artifact: { recommendations: expect.any(Array) } },
    });
    expect(getAiArtifactsFixtureProviderCalls("ai-artifacts-source-changed")).toBe(2);
  });
});
