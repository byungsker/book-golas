import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClientMock, exchangeCodeForSessionMock, getSupabasePublicConfigMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  getSupabasePublicConfigMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("@/shared/api/supabase/config", () => ({
  getSupabasePublicConfig: getSupabasePublicConfigMock,
}));

import { GET } from "./route";

function makeRequest(query: string) {
  return new NextRequest(`https://bookgolas.test/ko/auth/callback?${query}`);
}

describe("Supabase auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabasePublicConfigMock.mockReturnValue({
      url: "https://test.supabase.co",
      anonKey: "test-anon-key",
    });
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    createServerClientMock.mockReturnValue({
      auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
    });
  });

  it("redirects to the safe destination after a successful code exchange", async () => {
    const response = await GET(makeRequest("code=valid-code&returnTo=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/ko/home");
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("valid-code");
  });

  it("returns to sign-in when the PKCE exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: new Error("invalid code") });

    const response = await GET(makeRequest("code=replayed-code&returnTo=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/ko/auth/sign-in");
    expect(location.searchParams.get("error")).toBe("auth_callback");
    expect(location.searchParams.get("returnTo")).toBe("/ko/home");
    expect(location.searchParams.has("next")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(location.search).not.toContain("replayed-code");
    expect(location.search).not.toContain("invalid code");
  });

  it("returns the same safe error when the exchange throws", async () => {
    exchangeCodeForSessionMock.mockRejectedValue(new Error("private network detail"));

    const response = await GET(makeRequest("code=expired-code&returnTo=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/ko/auth/sign-in");
    expect(location.searchParams.get("error")).toBe("auth_callback");
    expect(location.search).not.toContain("private network detail");
  });

  it("returns a safe localized error when the provider denies or cancels", async () => {
    const response = await GET(
      makeRequest("error=access_denied&error_description=private-provider-detail&error_code=secret-code&returnTo=%2Fko%2Fhome"),
      { params: Promise.resolve({ locale: "ko" }) },
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/ko/auth/sign-in");
    expect(location.searchParams.get("error")).toBe("oauth_cancelled");
    expect(location.searchParams.get("returnTo")).toBe("/ko/home");
    expect(location.searchParams.has("next")).toBe(false);
    expect(location.search).not.toContain("private-provider-detail");
    expect(location.search).not.toContain("secret-code");
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it("normalizes provider failures without forwarding provider error data", async () => {
    const response = await GET(
      makeRequest("error=server_error&error_description=private-provider-detail&error_code=secret-code"),
      { params: Promise.resolve({ locale: "ko" }) },
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/ko/auth/sign-in");
    expect(location.searchParams.get("error")).toBe("oauth_provider");
    expect(location.search).not.toContain("private-provider-detail");
    expect(location.search).not.toContain("secret-code");
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it("rejects an external return target after a successful exchange", async () => {
    const response = await GET(
      makeRequest("code=valid-code&returnTo=https%3A%2F%2Fevil.example%2Faccount"),
      { params: Promise.resolve({ locale: "ko" }) },
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.origin).toBe("https://bookgolas.test");
    expect(location.pathname).toBe("/ko/home");
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("valid-code");
  });

  it("does not treat a missing callback code as success", async () => {
    const response = await GET(makeRequest("returnTo=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/ko/auth/sign-in");
    expect(location.searchParams.get("error")).toBe("auth_callback");
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it("rejects raw next aliases and ambiguous return targets", async () => {
    const rawNextResponse = await GET(makeRequest("code=valid-code&next=%2Fko%2Fbooks%2Fnew"), {
      params: Promise.resolve({ locale: "ko" }),
    });
    const duplicateResponse = await GET(
      makeRequest("code=valid-code&returnTo=%2Fko%2Fbooks%2Fnew&returnTo=%2Fko%2Faccount"),
      { params: Promise.resolve({ locale: "ko" }) },
    );

    expect(new URL(rawNextResponse.headers.get("location")!).pathname).toBe("/ko/home");
    expect(new URL(duplicateResponse.headers.get("location")!).pathname).toBe("/ko/home");
  });

  it("keeps provider configuration failures distinct from invalid callback codes", async () => {
    getSupabasePublicConfigMock.mockImplementation(() => {
      throw new Error("private configuration detail");
    });

    const response = await GET(makeRequest("code=valid-code&returnTo=%2Fko%2Fhome"), {
      params: Promise.resolve({ locale: "ko" }),
    });
    const location = new URL(response.headers.get("location")!);

    expect(location.searchParams.get("error")).toBe("oauth_provider");
    expect(location.search).not.toContain("private configuration detail");
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });
});
