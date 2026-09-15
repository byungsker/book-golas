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

const { middlewareCalls, createServerClientMock, observedRequestCookies, claimsState } = vi.hoisted(() => ({
  middlewareCalls: vi.fn(),
  createServerClientMock: vi.fn(),
  observedRequestCookies: [] as Array<string | null>,
  claimsState: { value: { sub: "user-a" } as { sub: string } | null },
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
        return { data: { claims: claimsState.value }, error: null };
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

  it.each([
    "/ko/home",
    "/en/library",
    "/ko/stats",
    "/en/calendar",
    "/ko/account/notifications",
    "/en/book-list",
    "/ko/books/new",
    "/en/books/scan",
    "/ko/subscription",
  ])("redirects an unauthorized protected route with an allowlisted return target: %s", async (pathname) => {
    claimsState.value = null;
    const response = await proxy(new NextRequest(`https://bookgolas.test${pathname}?view=all`));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe(`/${pathname.split("/")[1]}/auth/sign-in`);
    expect(location.searchParams.get("returnTo")).toBe(`${pathname}?view=all`);
    claimsState.value = { sub: "user-a" };
  });

  it("keeps admin authentication separate from consumer claims", async () => {
    const response = await proxy(new NextRequest("https://bookgolas.test/admin/users"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("treats an expired fixture session as unauthenticated", async () => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    const request = new NextRequest("https://bookgolas.test/en/library", {
      headers: { cookie: "bookgolas-route-fixture=expired-session" },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/en/auth/sign-in");
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it.each(["/ko/privacy", "/en/terms", "/support"])(
    "leaves marketing and legal routing outside the consumer auth gate: %s",
    async (pathname) => {
      claimsState.value = null;
      const response = await proxy(new NextRequest(`https://bookgolas.test${pathname}`));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      claimsState.value = { sub: "user-a" };
    },
  );
});
