import { describe, expect, it } from "vitest";
import { getConsumerRouteFixture } from "./route-fixture";

describe("consumer route fixture boundary", () => {
  it("enables deterministic auth states only against loopback Supabase", () => {
    expect(
      getConsumerRouteFixture("authenticated-not-found", {
        BOOKGOLAS_ROUTE_TEST_MODE: "enabled",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toBe("authenticated-not-found");
  });

  it("fails closed for disabled and remote environments", () => {
    expect(
      getConsumerRouteFixture("authenticated-not-found", {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toBeNull();
    expect(
      getConsumerRouteFixture("authenticated-not-found", {
        BOOKGOLAS_ROUTE_TEST_MODE: "enabled",
        NEXT_PUBLIC_SUPABASE_URL: "https://bookgolas.supabase.co",
      }),
    ).toBeNull();
  });

  it.each([
    "expired-session",
    "unauthorized-private-data",
    "pending",
    "unavailable",
  ] as const)("accepts the loopback-only %s state", (fixture) => {
    expect(
      getConsumerRouteFixture(fixture, {
        BOOKGOLAS_ROUTE_TEST_MODE: "enabled",
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      }),
    ).toBe(fixture);
  });
});
