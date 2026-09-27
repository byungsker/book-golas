import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { GET } from "@/app/api/consumer/account/route";
import { resetAccountSettingsFixtures } from "@/lib/consumer/account-settings-fixtures";

vi.mock("server-only", () => ({}));

function avatarRequest(fixture: string, includeIdentity = false) {
  const form = new FormData();
  form.set("avatar", new File(["image"], "avatar.png", { type: "image/png" }));
  if (includeIdentity) form.set("user_id", "10000000-0000-4000-8000-000000000001");
  return new NextRequest("http://localhost/api/consumer/account/avatar", {
    method: "POST",
    headers: { cookie: `bookgolas-route-fixture=${fixture}` },
    body: form,
  });
}

describe("consumer avatar route", () => {
  beforeEach(() => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    resetAccountSettingsFixtures();
  });

  it("updates the fixture avatar and rejects caller identity", async () => {
    const updated = await POST(avatarRequest("account-settings-happy"));
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ kind: "avatar_updated", path: expect.stringContaining("/avatar.png") });
    const denied = await POST(avatarRequest("account-settings-happy", true));
    expect(denied.status).toBe(400);
  });

  it("leaves the profile unchanged when storage upload fails", async () => {
    const before = await GET(new NextRequest("http://localhost/api/consumer/account", { headers: { cookie: "bookgolas-route-fixture=account-settings-avatar-failure" } }));
    const failed = await POST(avatarRequest("account-settings-avatar-failure"));
    const after = await GET(new NextRequest("http://localhost/api/consumer/account", { headers: { cookie: "bookgolas-route-fixture=account-settings-avatar-failure" } }));
    expect(failed.status).toBe(502);
    expect(await after.json()).toEqual(await before.json());
  });
});
