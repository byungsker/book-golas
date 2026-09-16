import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { resetAccountSettingsFixtures } from "@/lib/consumer/account-settings-fixtures";

vi.mock("server-only", () => ({}));

function request(fixture: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest("http://localhost/api/consumer/account", {
    ...init,
    headers: { cookie: `bookgolas-route-fixture=${fixture}`, ...(init.headers ?? {}) },
  });
}

describe("consumer account settings route", () => {
  beforeEach(() => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    resetAccountSettingsFixtures();
  });

  it("reads and round-trips the current profile", async () => {
    const first = await GET(request("account-settings-happy"));
    expect(first.status).toBe(200);
    const updated = await PATCH(request("account-settings-happy", { method: "PATCH", body: JSON.stringify({ nickname: "New Reader" }), headers: { "Content-Type": "application/json" } }));
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ profile: { nickname: "New Reader" } });
  });

  it("rejects caller identity and preserves unauthorized semantics", async () => {
    const foreign = await PATCH(request("account-settings-foreign", { method: "PATCH", body: JSON.stringify({ nickname: "Other", user_id: "10000000-0000-4000-8000-000000000001" }), headers: { "Content-Type": "application/json" } }));
    expect(foreign.status).toBe(400);
    const unauthorized = await GET(request("account-settings-unauthorized"));
    expect(unauthorized.status).toBe(401);
  });
});
