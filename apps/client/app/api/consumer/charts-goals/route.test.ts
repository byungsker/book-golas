import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/shared/api/supabase/index.server";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/api/supabase/index.server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("server-only", () => ({}));

const payload = { locale: "en", year: 2026, targetBooks: 40 };

function request(body: unknown, fixture?: string) {
  return new NextRequest("http://localhost/api/consumer/charts-goals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(fixture ? { Cookie: `bookgolas-route-fixture=${fixture}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/consumer/charts-goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
  });

  it("rejects caller supplied ownership fields", async () => {
    const response = await POST(request({ ...payload, user_id: "foreign-user" }, "charts-goals-goal"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("validation_error");
  });

  it("writes a fixture goal through the private route and returns a typed result", async () => {
    const response = await POST(request(payload, "charts-goals-goal"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: "goal_updated", year: 2026, targetBooks: 40 });
    expect(revalidatePath).toHaveBeenCalledWith("/en/stats");
  });

  it("preserves unauthorized and offline boundaries", async () => {
    const unauthorized = await POST(request(payload, "charts-goals-unauthorized"));
    expect(unauthorized.status).toBe(401);
    expect((await unauthorized.json()).error.code).toBe("unauthorized");

    const offline = await POST(request(payload, "charts-goals-offline"));
    expect(offline.status).toBe(503);
    expect((await offline.json()).error.code).toBe("offline");
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("generates a bounded fixture insight and preserves quota and provider errors", async () => {
    const insightPayload = {
      action: "generate_insight",
      locale: "en",
      requestKey: "00000000-0000-4000-8000-000000004396",
    };
    const success = await POST(request(insightPayload, "charts-goals-happy"));
    expect(success.status).toBe(200);
    expect(await success.json()).toMatchObject({ kind: "insight_generated", insights: [{ category: "pattern" }] });

    const quota = await POST(request(insightPayload, "charts-goals-ai-quota"));
    expect(quota.status).toBe(429);
    expect((await quota.json()).error.code).toBe("quota_exceeded");

    const provider = await POST(request(insightPayload, "charts-goals-ai-provider"));
    expect(provider.status).toBe(502);
    expect((await provider.json()).error.code).toBe("provider_error");
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
