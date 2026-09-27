import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "./route";
import { resetWebPushFixtures, webPushFixtureSubscription } from "@/lib/consumer/web-push-fixtures";

vi.mock("server-only", () => ({}));

function request(fixture: string, init: { method?: string; body?: string } = {}) {
  return new NextRequest("http://localhost/api/consumer/push", {
    ...init,
    headers: { cookie: `bookgolas-route-fixture=${fixture}`, "Content-Type": "application/json" },
  });
}

describe("consumer Web Push route", () => {
  beforeEach(() => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    resetWebPushFixtures();
  });

  it("registers one web subscription and supports removal", async () => {
    const input = { subscription: webPushFixtureSubscription, locale: "en" };
    const registered = await POST(request("web-push-happy", { method: "POST", body: JSON.stringify(input) }));
    expect(registered.status).toBe(200);
    expect(await registered.json()).toMatchObject({ kind: "web_push_registered", registered: true, deviceType: "web", delivery: "registration-only" });
    const status = await GET(request("web-push-happy"));
    expect(await status.json()).toMatchObject({ registered: true, deviceType: "web" });
    const removed = await DELETE(request("web-push-happy", { method: "DELETE" }));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ registered: false, deviceType: "web" });
  });

  it("rejects foreign identity and malformed browser subscriptions", async () => {
    const foreign = await POST(request("web-push-foreign", { method: "POST", body: JSON.stringify({ ...{ subscription: webPushFixtureSubscription, locale: "en" }, user_id: "foreign" }) }));
    expect(foreign.status).toBe(400);
    const malformed = await POST(request("web-push-happy", { method: "POST", body: JSON.stringify({ subscription: { endpoint: "https://push.example.invalid/send/test", keys: { p256dh: "x", auth: "y" } }, locale: "en" }) }));
    expect(malformed.status).toBe(400);
    const denied = await GET(request("web-push-denied"));
    expect(denied.status).toBe(200);
    expect(await denied.json()).toMatchObject({ registered: false, capability: "denied" });
  });
});
