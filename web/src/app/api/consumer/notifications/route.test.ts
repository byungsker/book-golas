import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { resetWebPushFixtures } from "@/lib/consumer/web-push-fixtures";

vi.mock("server-only", () => ({}));

function request(fixture: string, init: { method?: string; body?: string } = {}) {
  return new NextRequest("http://localhost/api/consumer/notifications", {
    ...init,
    headers: { cookie: `bookgolas-route-fixture=${fixture}`, "Content-Type": "application/json" },
  });
}

describe("consumer notification settings route", () => {
  beforeEach(() => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    resetWebPushFixtures();
  });

  it("reads and persists notification preferences for the fixture account", async () => {
    const first = await GET(request("web-push-happy"));
    expect(first.status).toBe(200);
    const updated = await PATCH(request("web-push-happy", { method: "PATCH", body: JSON.stringify({ dailyReminderEnabled: false }) }));
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ settings: { dailyReminderEnabled: false } });
  });

  it("rejects caller identity and preserves explicit failure states", async () => {
    const foreign = await PATCH(request("web-push-foreign", { method: "PATCH", body: JSON.stringify({ dailyReminderEnabled: false, user_id: "foreign" }) }));
    expect(foreign.status).toBe(400);
    const consent = await GET(request("web-push-consent"));
    expect(consent.status).toBe(403);
    const quota = await GET(request("web-push-quota"));
    expect(quota.status).toBe(429);
    const unauthorized = await GET(request("web-push-unauthorized"));
    expect(unauthorized.status).toBe(401);
  });
});
