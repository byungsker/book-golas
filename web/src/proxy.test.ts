import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { middlewareCalls } = vi.hoisted(() => ({
  middlewareCalls: vi.fn(),
}));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn((config) => {
    middlewareCalls(config);
    return (request: NextRequest) => {
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

describe("consumer locale proxy", () => {
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
});
