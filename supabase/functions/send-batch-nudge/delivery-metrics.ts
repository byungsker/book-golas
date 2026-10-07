export type PushFailureClassification = {
  failureCode: string;
  invalidToken: boolean;
};

export function classifyPushFailure(error: unknown): PushFailureClassification {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toUpperCase();

  if (
    normalized.includes("UNREGISTERED") ||
    normalized.includes("REGISTRATION-TOKEN-NOT-REGISTERED")
  ) {
    return { failureCode: "invalid_token", invalidToken: true };
  }

  if (normalized.includes("INVALID_ARGUMENT")) {
    return { failureCode: "provider_invalid_argument", invalidToken: false };
  }

  if (
    normalized.includes("RESOURCE_EXHAUSTED") ||
    normalized.includes("429")
  ) {
    return { failureCode: "provider_rate_limited", invalidToken: false };
  }

  if (
    normalized.includes("UNAVAILABLE") ||
    normalized.includes("DEADLINE_EXCEEDED") ||
    normalized.includes("503")
  ) {
    return { failureCode: "provider_unavailable", invalidToken: false };
  }

  return { failureCode: "provider_error", invalidToken: false };
}
