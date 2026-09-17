import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { POST } from "./route";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/consumer/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function mockServerClient(rpc: ReturnType<typeof vi.fn>) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    rpc,
  } as unknown as ServerSupabaseClient;
}

describe("consumer consent producer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records a validated consent through the authenticated RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockServerClient(rpc));

    const response = await POST(makeRequest({
      kind: "ai",
      status: "granted",
      version: "2026-09",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: "ai",
      status: "granted",
      version: "2026-09",
    });
    expect(rpc).toHaveBeenCalledWith("record_user_consent", {
      p_kind: "ai",
      p_status: "granted",
      p_version: "2026-09",
    });
  });

  it("rejects malformed consent without invoking the producer", async () => {
    const rpc = vi.fn();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockServerClient(rpc));

    const response = await POST(makeRequest({
      kind: "ai",
      status: "granted",
    }));

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports an unavailable server session boundary", async () => {
    vi.mocked(createServerSupabaseClient).mockRejectedValue(new Error("configuration unavailable"));

    const response = await POST(makeRequest({
      kind: "ai",
      status: "granted",
      version: "2026-09",
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });
});
