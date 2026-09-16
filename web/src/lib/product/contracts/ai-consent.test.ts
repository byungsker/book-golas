import { describe, expect, it } from "vitest";
import {
  AI_CONSENT_POLICY_VERSION,
  AI_OPERATIONAL_ERROR_MATRIX,
  AiConsentMutationRequestSchema,
  AiConsentRecordSchema,
  canSendToAiProvider,
  consentStateForRecord,
  mapAiOperationalError,
} from "@/lib/product/contracts";
import { mapAdapterError } from "@/lib/product/adapters/errors";

describe("AI provider consent contracts", () => {
  it("keeps provider, action and policy fields strict", () => {
    const request = AiConsentMutationRequestSchema.parse({
      action: "grant",
      locale: "ko",
      policyVersion: AI_CONSENT_POLICY_VERSION,
      provider: "open_ai",
    });

    expect(request).toMatchObject({ provider: "open_ai", policyVersion: 2 });
    expect(() => AiConsentMutationRequestSchema.parse({ ...request, user_id: "foreign-user" })).toThrow();
    expect(() => AiConsentMutationRequestSchema.parse({ ...request, provider: "other-provider" })).toThrow();
    expect(() => AiConsentMutationRequestSchema.parse({ ...request, policyVersion: 1 })).toThrow();
  });

  it("fails closed for absent, withdrawn and stale consent", () => {
    expect(consentStateForRecord(null)).toBe("unknown");
    expect(canSendToAiProvider(consentStateForRecord(null))).toBe(false);
    expect(consentStateForRecord({ granted: false, policyVersion: 2 })).toBe("not_allowed");
    expect(consentStateForRecord({ granted: true, policyVersion: 1 })).toBe("not_allowed");
    expect(consentStateForRecord({ granted: true, policyVersion: 2 })).toBe("allowed");
    expect(canSendToAiProvider("unknown")).toBe(false);
    expect(canSendToAiProvider("unavailable")).toBe(false);
    expect(canSendToAiProvider("not_allowed")).toBe(false);
    expect(canSendToAiProvider("allowed")).toBe(true);

    expect(AiConsentRecordSchema.parse({
      provider: "google_cloud_vision",
      state: "unknown",
      policyVersion: null,
      receiptId: null,
      disclosureLocale: null,
      grantedAt: null,
      withdrawnAt: null,
      updatedAt: null,
      canSend: false,
    }).canSend).toBe(false);
  });

  it("preserves distinct operational states for each provider failure", () => {
    for (const entry of AI_OPERATIONAL_ERROR_MATRIX) {
      expect(mapAiOperationalError({ code: entry.code, status: entry.status })).toBe(entry.state);
    }

    expect(mapAiOperationalError({ status: 401 })).toBe("unauthorized");
    expect(mapAiOperationalError({ status: 403 })).toBe("consent_required");
    expect(mapAiOperationalError({ status: 413 })).toBe("input_too_large");
    expect(mapAiOperationalError({ status: 429 })).toBe("quota_exceeded");
    expect(mapAiOperationalError({ status: 504 })).toBe("provider_timeout");
    expect(mapAiOperationalError({ status: 503 })).toBe("provider_error");
    expect(mapAdapterError({ code: "provider_timeout", status: 504 })).toMatchObject({ code: "provider_timeout", status: 504 });
    expect(mapAdapterError({ code: "budget_exceeded", status: 429 })).toMatchObject({ code: "budget_exceeded", status: 429 });
  });
});
