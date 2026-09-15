import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClientMock, exchangeCodeForSessionMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("@/lib/supabase-config", () => ({
  getSupabasePublicConfig: () => ({
    url: "https://test.supabase.co",
    anonKey: "test-anon-key",
  }),
}));

import { GET } from "./route";

function makeRequest(query: string) {
  return new NextRequest(`https://bookgolas.test/ko/auth/callback?${query}`);
}

describe("Supabase auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    createServerClientMock.mockReturnValue({
      auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
    });
  });

  it("redirects to the safe destination after a successful code exchange", async () => {
    const response = await GET(makeRequest("code=valid-code&next=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/ko/home");
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("valid-code");
  });

  it("returns to sign-in when the PKCE exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: new Error("invalid code") });

    const response = await GET(makeRequest("code=replayed-code&next=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/ko/auth/sign-in");
    expect(location.searchParams.get("error")).toBe("auth_callback");
    expect(location.searchParams.get("next")).toBe("/ko/home");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
