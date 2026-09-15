export type ConsumerRouteFixture =
  | "anonymous"
  | "authenticated-not-found"
  | "bootstrap-network"
  | "book-discovery-cancellation"
  | "book-discovery-consent"
  | "book-discovery-empty"
  | "book-discovery-offline"
  | "book-discovery-quota"
  | "book-discovery-recommendations"
  | "book-discovery-results"
  | "book-discovery-unauthorized"
  | "book-discovery-upstream"
  | "book-lifecycle-conflict"
  | "book-lifecycle-consent"
  | "book-lifecycle-duplicate"
  | "book-lifecycle-error"
  | "book-lifecycle-foreign"
  | "book-lifecycle-invalid"
  | "book-lifecycle-offline"
  | "book-lifecycle-quota"
  | "book-lifecycle-success"
  | "book-lifecycle-unauthorized"
  | "book-detail-completed"
  | "book-detail-conflict"
  | "book-detail-deleted"
  | "book-detail-delete"
  | "book-detail-foreign"
  | "book-detail-invalid-transition"
  | "book-detail-paused"
  | "book-detail-planned"
  | "book-detail-reading"
  | "book-detail-success"
  | "deleted-book"
  | "expired-session"
  | "home-book-list"
  | "home-empty-completed"
  | "home-empty-paused"
  | "home-empty-planned"
  | "home-empty-reading"
  | "invalid-session"
  | "library-book-list"
  | "library-cancellation"
  | "library-consent"
  | "library-empty"
  | "library-empty-reading"
  | "library-empty-records"
  | "library-empty-review"
  | "library-error"
  | "library-foreign"
  | "library-network"
  | "library-pending"
  | "library-quota"
  | "library-recall"
  | "library-recall-empty"
  | "library-unauthorized"
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
    "book-discovery-cancellation",
    "book-discovery-consent",
    "book-discovery-empty",
    "book-discovery-offline",
    "book-discovery-quota",
    "book-discovery-recommendations",
    "book-discovery-results",
    "book-discovery-unauthorized",
    "book-discovery-upstream",
    "book-lifecycle-conflict",
    "book-lifecycle-consent",
    "book-lifecycle-duplicate",
    "book-lifecycle-error",
    "book-lifecycle-foreign",
    "book-lifecycle-invalid",
    "book-lifecycle-offline",
    "book-lifecycle-quota",
    "book-lifecycle-success",
    "book-lifecycle-unauthorized",
    "book-detail-completed",
    "book-detail-conflict",
    "book-detail-deleted",
    "book-detail-delete",
    "book-detail-foreign",
    "book-detail-invalid-transition",
    "book-detail-paused",
    "book-detail-planned",
    "book-detail-reading",
    "book-detail-success",
    "deleted-book",
    "expired-session",
    "home-book-list",
    "home-empty-completed",
    "home-empty-paused",
    "home-empty-planned",
    "home-empty-reading",
    "invalid-session",
    "library-book-list",
    "library-cancellation",
    "library-consent",
    "library-empty",
    "library-empty-reading",
    "library-empty-records",
    "library-empty-review",
    "library-error",
    "library-foreign",
    "library-network",
    "library-pending",
    "library-quota",
    "library-recall",
    "library-recall-empty",
    "library-unauthorized",
    "unauthorized-private-data",
    "pending",
    "unavailable",
  ].includes(cookieValue ?? "")
    ? cookieValue as Exclude<ConsumerRouteFixture, "anonymous" | null>
    : "anonymous";
}
