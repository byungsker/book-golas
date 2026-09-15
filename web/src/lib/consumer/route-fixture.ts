export type ConsumerRouteFixture = "anonymous" | "authenticated-not-found" | null;

type RouteFixtureEnvironment = Readonly<Record<string, string | undefined>>;

export function getConsumerRouteFixture(
  cookieValue: string | undefined,
  environment: RouteFixtureEnvironment = process.env,
): ConsumerRouteFixture {
  if (environment.BOOKGOLAS_ROUTE_TEST_MODE !== "enabled") return null;

  try {
    const hostname = new URL(environment.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) return null;
  } catch {
    return null;
  }

  return cookieValue === "authenticated-not-found"
    ? "authenticated-not-found"
    : "anonymous";
}
