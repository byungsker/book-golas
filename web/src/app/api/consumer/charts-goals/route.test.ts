import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseClient: vi.fn() }));

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
});
