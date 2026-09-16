import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { resetAiArtifactsFixtures } from "@/lib/consumer/ai-artifacts-fixtures";

vi.mock("server-only", () => ({}));

const bookId = "00000000-0000-4000-8000-000000004421";
const requestKey = "00000000-0000-4000-8000-000000004499";

function request(method: "GET" | "POST", fixture: string, body?: unknown, query = "kind=insights&locale=en") {
  return new NextRequest(`http://localhost/api/consumer/ai-artifacts?${query}`, {
    method,
    headers: {
      Cookie: `bookgolas-route-fixture=${fixture}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("/api/consumer/ai-artifacts", () => {
  beforeEach(() => {
    resetAiArtifactsFixtures();
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
  });

  it("reads the three artifact kinds through a private cache envelope", async () => {
    const mindmap = await GET(request("GET", "ai-artifacts-happy", undefined, `kind=mindmap&locale=ko&bookId=${bookId}`));
    const insights = await GET(request("GET", "ai-artifacts-happy"));
    const recommendations = await GET(request("GET", "ai-artifacts-happy", undefined, "kind=recommendations&locale=en"));
    expect(mindmap.status).toBe(200);
    expect((await mindmap.json()).kind).toBe("mindmap");
    expect((await insights.json()).kind).toBe("insights");
    expect((await recommendations.json()).kind).toBe("recommendations");
    expect(mindmap.headers.get("cache-control")).toBe("private, no-store");
  });

  it("turns missing and expired cache reads into one typed generation result", async () => {
    const missing = await GET(request("GET", "ai-artifacts-missing", undefined, `kind=mindmap&locale=en&bookId=${bookId}`));
    expect(await missing.json()).toMatchObject({ kind: "mindmap", cacheState: "missing", artifact: null });
    const generated = await POST(request("POST", "ai-artifacts-missing", { kind: "mindmap", locale: "en", bookId, requestKey }, "kind=mindmap"));
    expect(generated.status).toBe(200);
    expect(await generated.json()).toMatchObject({ kind: "mindmap", cacheState: "missing", requestKey });

    const expired = await GET(request("GET", "ai-artifacts-expired", undefined, "kind=recommendations&locale=en"));
    expect(await expired.json()).toMatchObject({ kind: "recommendations", cacheState: "expired", artifact: null });
  });

  it("rejects caller identity and keeps policy/provider/transport states distinct", async () => {
    const malformed = await POST(request("POST", "ai-artifacts-happy", { kind: "insights", locale: "en", requestKey, user_id: "foreign" }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("validation_error");

    for (const [fixture, status, code] of [
      ["ai-artifacts-consent", 403, "consent_required"],
      ["ai-artifacts-quota", 429, "quota_exceeded"],
      ["ai-artifacts-rate-limit", 429, "rate_limit_exceeded"],
      ["ai-artifacts-provider", 502, "provider_error"],
      ["ai-artifacts-offline", 503, "offline"],
      ["ai-artifacts-unauthorized", 401, "unauthorized"],
      ["ai-artifacts-foreign", 404, "not_found"],
    ] as const) {
      const response = await POST(request("POST", fixture, { kind: "insights", locale: "en", requestKey }));
      expect(response.status).toBe(status);
      expect((await response.json()).error.code).toBe(code);
    }
  });
});
