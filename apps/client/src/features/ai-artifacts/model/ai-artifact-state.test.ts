import { describe, expect, it } from "vitest";
import type { ProductError } from "@/shared/api/product/errors";
import {
  aiArtifactErrorMessageKey,
  aiArtifactSafeActionForError,
  aiArtifactStateForError,
} from "./ai-artifact-state";

function error(code: ProductError["code"], status: ProductError["status"]): ProductError {
  return { code, status, message: code, retryable: status >= 429 };
}

describe("AI artifact consumer states", () => {
  it("keeps every provider policy failure distinct", () => {
    const cases = [
      [error("consent_status_unknown", 503), "unknown"],
      [error("unavailable", 503), "unavailable"],
      [error("consent_required", 403), "consent_required"],
      [error("rate_limit_exceeded", 429), "rate_limit_exceeded"],
      [error("quota_exceeded", 429), "quota_exceeded"],
      [error("concurrency_exceeded", 429), "concurrency_exceeded"],
      [error("budget_exceeded", 429), "budget_exceeded"],
      [error("hard_cap_exceeded", 429), "hard_cap_exceeded"],
      [error("provider_timeout", 504), "provider_timeout"],
      [error("provider_error", 502), "provider_error"],
      [error("offline", 503), "offline"],
    ] as const;

    for (const [failure, state] of cases) {
      expect(aiArtifactStateForError(failure)).toBe(state);
      expect(aiArtifactErrorMessageKey(failure)).toBe(state);
    }
  });

  it("routes only identity and consent recovery away from retry", () => {
    expect(aiArtifactSafeActionForError(error("unauthorized", 401))).toBe("sign_in");
    expect(aiArtifactSafeActionForError(error("consent_required", 403))).toBe("open_settings");
    expect(aiArtifactSafeActionForError(error("consent_status_unknown", 503))).toBe("open_settings");
    expect(aiArtifactSafeActionForError(error("hard_cap_exceeded", 429))).toBe("retry");
  });
});
