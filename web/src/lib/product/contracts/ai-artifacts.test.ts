import { describe, expect, it } from "vitest";
import {
  AiArtifactGenerateRequestSchema,
  AiArtifactReadResponseSchema,
  AiArtifactUiStateSchema,
} from "./ai-artifacts";

const bookId = "00000000-0000-4000-8000-000000004421";
const requestKey = "00000000-0000-4000-8000-000000004499";
const generatedAt = "2026-09-15T00:00:00.000Z";

describe("AI artifact contracts", () => {
  it("keeps each artifact request strict and owner-free", () => {
    const mindmap = AiArtifactGenerateRequestSchema.parse({ kind: "mindmap", bookId, locale: "ko", requestKey });
    const insights = AiArtifactGenerateRequestSchema.parse({ kind: "insights", locale: "en", requestKey });
    const recommendations = AiArtifactGenerateRequestSchema.parse({ kind: "recommendations", locale: "en", requestKey });
    expect(mindmap.kind).toBe("mindmap");
    expect(insights.locale).toBe("en");
    expect(recommendations.kind).toBe("recommendations");
    expect(() => AiArtifactGenerateRequestSchema.parse({ ...mindmap, user_id: "foreign-user" })).toThrow();
  });

  it("models fresh, missing and expired cache envelopes", () => {
    expect(AiArtifactReadResponseSchema.parse({ kind: "mindmap", cacheState: "fresh", createdAt: generatedAt, artifact: { bookId, generatedAt, clusters: [], connections: [] } }).cacheState).toBe("fresh");
    expect(AiArtifactReadResponseSchema.parse({ kind: "insights", cacheState: "missing", createdAt: null, artifact: null }).artifact).toBeNull();
    expect(AiArtifactReadResponseSchema.parse({ kind: "recommendations", cacheState: "expired", createdAt: generatedAt, artifact: null }).cacheState).toBe("expired");
  });

  it("keeps operational UI states distinct", () => {
    expect(AiArtifactUiStateSchema.options).toEqual(expect.arrayContaining([
      "loading",
      "empty",
      "error",
      "unauthorized",
      "consent_required",
      "quota_exceeded",
      "offline",
      "rate_limit_exceeded",
      "provider_error",
    ]));
  });
});
