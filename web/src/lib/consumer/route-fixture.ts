export type ConsumerRouteFixture =
  | "anonymous"
  | "authenticated-not-found"
  | "bootstrap-network"
  | "deleted-book"
  | "expired-session"
  | "home-book-list"
  | "home-empty-completed"
  | "home-empty-paused"
  | "home-empty-planned"
  | "home-empty-reading"
  | "invalid-session"
  | "unauthorized-private-data"
  | "pending"
  | "unavailable"
  | null;

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

  return [
    "authenticated-not-found",
    "bootstrap-network",
    "deleted-book",
    "expired-session",
    "home-book-list",
    "home-empty-completed",
    "home-empty-paused",
    "home-empty-planned",
    "home-empty-reading",
    "invalid-session",
    "unauthorized-private-data",
    "pending",
    "unavailable",
  ].includes(cookieValue ?? "")
    ? cookieValue as Exclude<ConsumerRouteFixture, "anonymous" | null>
    : "anonymous";
}
