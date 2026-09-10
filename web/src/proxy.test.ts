import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

type ProxyCookie = Readonly<{
  name: string;
  value: string;
  options?: Readonly<{
    httpOnly?: boolean;
    path?: string;
  }>;
}>;

type ProxyClientOptions = Readonly<{
  cookies: Readonly<{
    getAll: () => readonly Readonly<{ name: string; value: string }>[];
    setAll: (cookiesToSet: readonly ProxyCookie[]) => void;
  }>;
}>;

const { middlewareCalls, createServerClientMock, observedRequestCookies } = vi.hoisted(() => ({
  middlewareCalls: vi.fn(),
  createServerClientMock: vi.fn(),
  observedRequestCookies: [] as Array<string | null>,
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn((config) => {
    middlewareCalls(config);
    return (request: NextRequest) => {
      observedRequestCookies.push(
        request.cookies.get("sb-test-auth-token")?.value ?? null,
      );
      const headers = new Headers(request.headers);
      headers.set(
        "x-next-intl-locale",
        request.nextUrl.pathname.split("/")[1],
      );
      return NextResponse.next({ request: { headers } });
    };
  }),
}));

import { proxy } from "./proxy";

createServerClientMock.mockImplementation(
  (_url: string, _key: string, options: ProxyClientOptions) => ({
    auth: {
      getClaims: vi.fn(async () => {
        options.cookies.setAll([
          {
            name: "sb-test-auth-token",
            value: "refreshed",
            options: { httpOnly: true, path: "/" },
          },
        ]);
        return { data: { claims: { sub: "user-a" } }, error: null };
      }),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  }),
);

describe("consumer locale proxy", () => {
  it("uses an always-prefixed middleware for the marketing locale surface", () => {
    expect(middlewareCalls.mock.calls[0]?.[0]).toMatchObject({
      localePrefix: "always",
    });
  });

  it("uses an always-prefixed middleware for consumer routes", () => {
    expect(middlewareCalls.mock.calls[1]?.[0]).toMatchObject({
      localePrefix: "always",
    });
  });

  it.each(["ko", "en"])('preserves the matched "%s" locale', async (locale) => {
    const request = new NextRequest(`https://bookgolas.test/${locale}/home`);
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe(
      locale,
    );
  });

  it("copies a refreshed cookie to the request and browser response", async () => {
    const request = new NextRequest("https://bookgolas.test/ko/home", {
      headers: { cookie: "sb-test-auth-token=expired" },
    });

    const response = await proxy(request);

    expect(request.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
    expect(observedRequestCookies.at(-1)).toBe("refreshed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
