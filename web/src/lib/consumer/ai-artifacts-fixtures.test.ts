import { describe, expect, it, beforeEach } from "vitest";
import { AiArtifactGenerateRequestSchema } from "@/lib/product/contracts";
import { getAiArtifactsFixtureGenerate, getAiArtifactsFixtureRead, resetAiArtifactsFixtures } from "./ai-artifacts-fixtures";

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

  it("keeps consent, quota, rate-limit, provider, offline and owner failures typed", () => {
    for (const [fixture, code] of [
      ["ai-artifacts-consent", "consent_required"],
      ["ai-artifacts-quota", "quota_exceeded"],
      ["ai-artifacts-rate-limit", "rate_limit_exceeded"],
      ["ai-artifacts-provider", "provider_error"],
      ["ai-artifacts-offline", "offline"],
      ["ai-artifacts-unauthorized", "unauthorized"],
      ["ai-artifacts-foreign", "not_found"],
    ] as const) {
      expect(getAiArtifactsFixtureRead({ fixture, kind: "insights" })).toMatchObject({ ok: false, error: { code } });
    }
  });

  it("returns one result for a replayed request key", () => {
    const first = getAiArtifactsFixtureGenerate(request, "ai-artifacts-missing");
    const replay = getAiArtifactsFixtureGenerate(request, "ai-artifacts-missing");
    expect(first).toEqual(replay);
  });
});
