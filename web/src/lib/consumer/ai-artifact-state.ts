import type { AiArtifactUiState } from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";

export type AiArtifactSafeAction = "open_settings" | "retry" | "sign_in";

export function aiArtifactStateForError(error: ProductError): AiArtifactUiState {
  switch (error.code) {
    case "unauthorized":
      return "unauthorized";
    case "consent_required":
      return "consent_required";
    case "consent_status_unknown":
      return "unknown";
    case "unavailable":
      return "unavailable";
    case "insufficient_data":
    case "validation_error":
      return "insufficient_data";
    case "rate_limit_exceeded":
    case "rate_limited":
      return "rate_limit_exceeded";
    case "quota_exceeded":
      return "quota_exceeded";
    case "concurrency_exceeded":
      return "concurrency_exceeded";
    case "budget_exceeded":
      return "budget_exceeded";
    case "hard_cap_exceeded":
      return "hard_cap_exceeded";
    case "provider_timeout":
    case "timeout":
      return "provider_timeout";
    case "provider_error":
      return "provider_error";
    case "configuration_error":
      return "configuration_error";
    case "offline":
      return "offline";
    default:
      return "error";
  }
}

export function aiArtifactSafeActionForError(error: ProductError): AiArtifactSafeAction {
  switch (error.code) {
    case "unauthorized":
      return "sign_in";
    case "consent_required":
    case "consent_status_unknown":
      return "open_settings";
    default:
      return "retry";
  }
}

export function aiArtifactErrorMessageKey(error: ProductError): string {
  const state = aiArtifactStateForError(error);
  return state === "error" ? "generic" : state;
}
