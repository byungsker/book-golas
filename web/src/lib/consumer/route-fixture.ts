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
  | "progress-complete"
  | "progress-consent"
  | "progress-deleted"
  | "progress-duplicate"
  | "progress-empty"
  | "progress-forward"
  | "progress-foreign"
  | "progress-invalid"
  | "progress-offline"
  | "progress-quota"
  | "progress-retry"
  | "progress-server-error"
  | "progress-stale"
  | "progress-unauthorized"
  | "progress-unavailable"
  | "timer-conflict"
  | "timer-deleted"
  | "timer-duplicate"
  | "timer-error"
  | "timer-foreign"
  | "timer-happy"
  | "timer-logout"
  | "timer-minimum"
  | "timer-offline"
  | "timer-over-max"
  | "timer-unauthorized"
  | "notes-highlights-conflict"
  | "notes-highlights-consent"
  | "notes-highlights-deleted"
  | "notes-highlights-empty"
  | "notes-highlights-error"
  | "notes-highlights-foreign"
  | "notes-highlights-happy"
  | "notes-highlights-index-failure"
  | "notes-highlights-invalid"
  | "notes-highlights-offline"
  | "notes-highlights-quota"
  | "notes-highlights-unauthorized"
  | "images-ocr-consent"
  | "images-ocr-corrupt"
  | "images-ocr-denied"
  | "images-ocr-deleted"
  | "images-ocr-empty"
  | "images-ocr-error"
  | "images-ocr-expired-url"
  | "images-ocr-foreign"
  | "images-ocr-happy"
  | "images-ocr-insecure"
  | "images-ocr-offline"
  | "images-ocr-oversize"
  | "images-ocr-provider-failure"
  | "images-ocr-quota"
  | "images-ocr-unauthorized"
  | "images-ocr-unsupported"
  | "images-ocr-wrong-mime"
  | "review-share-consent"
  | "review-share-deleted"
  | "review-share-empty"
  | "review-share-error"
  | "review-share-foreign"
  | "review-share-happy"
  | "review-share-no-memos"
  | "review-share-offline"
  | "review-share-provider"
  | "review-share-quota"
  | "review-share-timeout"
  | "review-share-unauthorized"
  | "calendar-consent"
  | "calendar-empty"
  | "calendar-error"
  | "calendar-foreign"
  | "calendar-happy"
  | "calendar-network"
  | "calendar-offline"
  | "calendar-quota"
  | "calendar-unauthorized"
  | "charts-goals-consent"
  | "charts-goals-deleted"
  | "charts-goals-empty"
  | "charts-goals-error"
  | "charts-goals-foreign"
  | "charts-goals-goal"
  | "charts-goals-happy"
  | "charts-goals-invalid-range"
  | "charts-goals-network"
  | "charts-goals-offline"
  | "charts-goals-quota"
  | "charts-goals-stale"
  | "charts-goals-unauthorized"
  | "ai-artifacts-consent"
  | "ai-artifacts-empty"
  | "ai-artifacts-expired"
  | "ai-artifacts-foreign"
  | "ai-artifacts-happy"
  | "ai-artifacts-missing"
  | "ai-artifacts-offline"
  | "ai-artifacts-provider"
  | "ai-artifacts-quota"
  | "ai-artifacts-rate-limit"
  | "ai-artifacts-source-changed"
  | "ai-artifacts-unauthorized"
  | "account-settings-avatar-failure"
  | "account-settings-consent"
  | "account-settings-empty"
  | "account-settings-error"
  | "account-settings-foreign"
  | "account-settings-happy"
  | "account-settings-language"
  | "account-settings-network"
  | "account-settings-offline"
  | "account-settings-password-failure"
  | "account-settings-quota"
  | "account-settings-subscription-disabled"
  | "account-settings-unauthorized"
  | "web-push-consent"
  | "web-push-denied"
  | "web-push-error"
  | "web-push-foreign"
  | "web-push-happy"
  | "web-push-network"
  | "web-push-offline"
  | "web-push-provider"
  | "web-push-quota"
  | "web-push-registered"
  | "web-push-unauthorized"
  | "web-push-unsupported"
  | "ai-consent-budget"
  | "ai-consent-configuration"
  | "ai-consent-concurrency"
  | "ai-consent-consent"
  | "ai-consent-daily-rate-limit"
  | "ai-consent-foreign"
  | "ai-consent-happy"
  | "ai-consent-hard-cap"
  | "ai-consent-input-too-large"
  | "ai-consent-insufficient-data"
  | "ai-consent-offline"
  | "ai-consent-provider"
  | "ai-consent-quota"
  | "ai-consent-receipt"
  | "ai-consent-server-error"
  | "ai-consent-state"
  | "ai-consent-status-unavailable"
  | "ai-consent-timeout"
  | "ai-consent-unknown"
  | "ai-consent-unauthorized"
  | "recall-consent"
  | "recall-empty"
  | "recall-foreign"
  | "recall-happy"
  | "recall-image"
  | "recall-offline"
  | "recall-provider"
  | "recall-quota"
  | "recall-unauthorized"
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
    "progress-complete",
    "progress-consent",
    "progress-deleted",
    "progress-duplicate",
    "progress-empty",
    "progress-forward",
    "progress-foreign",
    "progress-invalid",
    "progress-offline",
    "progress-quota",
    "progress-retry",
    "progress-server-error",
    "progress-stale",
    "progress-unauthorized",
    "progress-unavailable",
    "timer-conflict",
    "timer-deleted",
    "timer-duplicate",
    "timer-error",
    "timer-foreign",
    "timer-happy",
    "timer-logout",
    "timer-minimum",
    "timer-offline",
    "timer-over-max",
    "timer-unauthorized",
    "notes-highlights-conflict",
    "notes-highlights-consent",
    "notes-highlights-deleted",
    "notes-highlights-empty",
    "notes-highlights-error",
    "notes-highlights-foreign",
    "notes-highlights-happy",
    "notes-highlights-index-failure",
    "notes-highlights-invalid",
    "notes-highlights-offline",
    "notes-highlights-quota",
    "notes-highlights-unauthorized",
    "images-ocr-consent",
    "images-ocr-corrupt",
    "images-ocr-denied",
    "images-ocr-deleted",
    "images-ocr-empty",
    "images-ocr-error",
    "images-ocr-expired-url",
    "images-ocr-foreign",
    "images-ocr-happy",
    "images-ocr-insecure",
    "images-ocr-offline",
    "images-ocr-oversize",
    "images-ocr-provider-failure",
    "images-ocr-quota",
    "images-ocr-unauthorized",
    "images-ocr-unsupported",
    "images-ocr-wrong-mime",
    "review-share-consent",
    "review-share-deleted",
    "review-share-empty",
    "review-share-error",
    "review-share-foreign",
    "review-share-happy",
    "review-share-no-memos",
    "review-share-offline",
    "review-share-provider",
    "review-share-quota",
    "review-share-timeout",
    "review-share-unauthorized",
    "calendar-consent",
    "calendar-empty",
    "calendar-error",
    "calendar-foreign",
    "calendar-happy",
    "calendar-network",
    "calendar-offline",
    "calendar-quota",
    "calendar-unauthorized",
    "charts-goals-consent",
    "charts-goals-deleted",
    "charts-goals-empty",
    "charts-goals-error",
    "charts-goals-foreign",
    "charts-goals-goal",
    "charts-goals-happy",
    "charts-goals-invalid-range",
    "charts-goals-network",
    "charts-goals-offline",
    "charts-goals-quota",
    "charts-goals-stale",
    "charts-goals-unauthorized",
    "ai-artifacts-consent",
    "ai-artifacts-empty",
    "ai-artifacts-expired",
    "ai-artifacts-foreign",
    "ai-artifacts-happy",
    "ai-artifacts-missing",
    "ai-artifacts-offline",
    "ai-artifacts-provider",
    "ai-artifacts-quota",
    "ai-artifacts-rate-limit",
    "ai-artifacts-source-changed",
    "ai-artifacts-unauthorized",
    "account-settings-avatar-failure",
    "account-settings-consent",
    "account-settings-empty",
    "account-settings-error",
    "account-settings-foreign",
    "account-settings-happy",
    "account-settings-language",
    "account-settings-network",
    "account-settings-offline",
    "account-settings-password-failure",
    "account-settings-quota",
    "account-settings-subscription-disabled",
    "account-settings-unauthorized",
    "web-push-consent",
    "web-push-denied",
    "web-push-error",
    "web-push-foreign",
    "web-push-happy",
    "web-push-network",
    "web-push-offline",
    "web-push-provider",
    "web-push-quota",
    "web-push-registered",
    "web-push-unauthorized",
    "web-push-unsupported",
    "ai-consent-budget",
    "ai-consent-configuration",
    "ai-consent-concurrency",
    "ai-consent-consent",
    "ai-consent-daily-rate-limit",
    "ai-consent-foreign",
    "ai-consent-happy",
    "ai-consent-hard-cap",
    "ai-consent-input-too-large",
    "ai-consent-insufficient-data",
    "ai-consent-offline",
    "ai-consent-provider",
    "ai-consent-quota",
    "ai-consent-receipt",
    "ai-consent-server-error",
    "ai-consent-state",
    "ai-consent-status-unavailable",
    "ai-consent-timeout",
    "ai-consent-unknown",
    "ai-consent-unauthorized",
    "recall-consent",
    "recall-empty",
    "recall-foreign",
    "recall-happy",
    "recall-image",
    "recall-offline",
    "recall-provider",
    "recall-quota",
    "recall-unauthorized",
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
