import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { invokeProductFunctionForSession } from "@/lib/product/adapters";
import { resetAccountDeletionFixtures } from "@/lib/consumer/account-deletion-fixtures";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/product/adapters", () => ({ invokeProductFunctionForSession: vi.fn() }));

const userId = "20000000-0000-4000-8000-000000000002";
const acceptedAt = "2026-09-16T00:00:00.000Z";

function request(body: unknown, fixture?: string): NextRequest {
  return new NextRequest("http://localhost/api/consumer/account/deletion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(fixture ? { Cookie: `bookgolas-route-fixture=${fixture}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeClient(options: {
  provider?: string;
  passwordError?: Error | null;
  session?: { access_token: string } | null;
} = {}) {
  const user = {
    id: userId,
    email: "reader@example.com",
    identities: [{ provider: options.provider ?? "email" }],
    app_metadata: { provider: options.provider ?? "email" },
  };
  const signInWithPassword = vi.fn().mockResolvedValue({ error: options.passwordError ?? null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: options.session === undefined ? { access_token: "session-token" } : options.session }, error: null }),
      signInWithPassword,
      signOut,
    },
  };
  return { client, signInWithPassword, signOut };
}

describe("/api/consumer/account/deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    resetAccountDeletionFixtures();
    vi.mocked(invokeProductFunctionForSession).mockResolvedValue({
      ok: true,
      value: { status: "completed", acceptedAt },
    } as never);
  });

  it("cancel-or-retry: leaves the account untouched when confirmation is cancelled or malformed", async () => {
    const cancelled = await POST(request({ confirmation: false, confirmationText: "DELETE" }, "account-deletion-cancel-or-retry"));
    expect(cancelled.status).toBe(400);
    expect(invokeProductFunctionForSession).not.toHaveBeenCalled();

    const callerSelected = await POST(request({ confirmation: true, confirmationText: "DELETE", user_id: userId }, "account-deletion-cancel-or-retry"));
    expect(callerSelected.status).toBe(400);
    expect(invokeProductFunctionForSession).not.toHaveBeenCalled();
  });

  it("re-authenticates a password account before invoking delete-user and signs out", async () => {
    const auth = makeClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(auth.client as never);

    const response = await POST(request({ confirmation: true, confirmationText: "DELETE", currentPassword: "current-password" }));

    expect(response.status).toBe(200);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "reader@example.com", password: "current-password" });
    expect(invokeProductFunctionForSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
      "delete-user",
      { confirmation: true },
      expect.anything(),
    );
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ status: "completed", acceptedAt });
  });

  it("rejects an incorrect password without invoking the destructive function", async () => {
    const auth = makeClient({ passwordError: new Error("Invalid login credentials") });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(auth.client as never);

    const response = await POST(request({ confirmation: true, confirmationText: "삭제", currentPassword: "wrong" }));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
    expect(invokeProductFunctionForSession).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("allows an OAuth session after current-session validation without requesting a password", async () => {
    const auth = makeClient({ provider: "google" });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(auth.client as never);

    const response = await POST(request({ confirmation: true, confirmationText: "DELETE" }));

    expect(response.status).toBe(200);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(invokeProductFunctionForSession).toHaveBeenCalledOnce();
  });

  it("cancel-or-retry: returns the idempotent already-deleted receipt on retry", async () => {
    const first = await POST(request({ confirmation: true, confirmationText: "DELETE" }, "account-deletion-cancel-or-retry"));
    const second = await POST(request({ confirmation: true, confirmationText: "DELETE" }, "account-deletion-cancel-or-retry"));
    expect(await first.json()).toMatchObject({ status: "completed" });
    expect(await second.json()).toMatchObject({ status: "already_deleted" });
  });

  it.each([
    ["account-deletion-unauthorized", 401, "unauthorized"],
    ["account-deletion-offline", 503, "offline"],
    ["account-deletion-quota", 429, "quota_exceeded"],
  ] as const)("preserves the %s boundary", async (fixture, status, code) => {
    const response = await POST(request({ confirmation: true, confirmationText: "DELETE" }, fixture));
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
  });
});
