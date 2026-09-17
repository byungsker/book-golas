import { beforeEach, describe, expect, it } from "vitest";
import {
  applyAiConsentFixtureMutation,
  getAiConsentFixture,
  resetAiConsentFixtures,
} from "./ai-consent-fixtures";

const grantOpenAi = {
  action: "grant" as const,
  locale: "en" as const,
  policyVersion: 2 as const,
  provider: "open_ai" as const,
};

describe("AI provider consent fixtures", () => {
  beforeEach(() => resetAiConsentFixtures());

  it("returns provider-specific policy and receipt state", () => {
    const result = getAiConsentFixture("ai-consent-state");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.consents).toHaveLength(2);
    expect(result.value.consents.every((record) => record.state === "allowed")).toBe(true);
    expect(result.value.consents.every((record) => record.policyVersion === 2)).toBe(true);
    expect(result.value.consents.every((record) => record.receiptId)).toBe(true);
    expect(new Set(result.value.consents.map((record) => record.receiptId)).size).toBe(2);
  });

  it("grants and withdraws one provider without changing the other", () => {
    const initial = getAiConsentFixture("ai-consent-happy");
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    expect(initial.value.consents.find((record) => record.provider === "open_ai")?.state).toBe("not_allowed");

    const granted = applyAiConsentFixtureMutation("ai-consent-happy", grantOpenAi);
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    expect(granted.value).toMatchObject({ provider: "open_ai", action: "grant", state: "allowed", policyVersion: 2, canSend: true });
    expect(granted.value.receiptId).toBeTruthy();

    const afterGrant = getAiConsentFixture("ai-consent-happy");
    expect(afterGrant.ok).toBe(true);
    if (!afterGrant.ok) return;
    expect(afterGrant.value.consents.find((record) => record.provider === "open_ai")?.canSend).toBe(true);
    expect(afterGrant.value.consents.find((record) => record.provider === "google_cloud_vision")?.state).toBe("not_allowed");

    const withdrawn = applyAiConsentFixtureMutation("ai-consent-happy", { ...grantOpenAi, action: "withdraw" });
    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) return;
    expect(withdrawn.value).toMatchObject({ provider: "open_ai", action: "withdraw", state: "not_allowed", canSend: false });
    expect(withdrawn.value.receiptId).toBe(granted.value.receiptId);
  });

  it("represents unknown and unavailable status without permitting a send", () => {
    const unknown = getAiConsentFixture("ai-consent-unknown");
    expect(unknown.ok).toBe(true);
    if (unknown.ok) {
      expect(unknown.value.consents.every((record) => record.state === "unknown" && !record.canSend)).toBe(true);
    }

    const unavailable = getAiConsentFixture("ai-consent-status-unavailable");
    expect(unavailable.ok).toBe(true);
    if (unavailable.ok) {
      expect(unavailable.value.consents.every((record) => record.state === "unavailable" && !record.canSend)).toBe(true);
    }

    const mutation = applyAiConsentFixtureMutation("ai-consent-unknown", grantOpenAi);
    expect(mutation).toMatchObject({ ok: false, error: { code: "consent_status_unknown", status: 503 } });
  });

  it("keeps unauthorized, consent, payload, quota and provider failures distinct", () => {
    const expectations = [
      ["ai-consent-unauthorized", 401, "unauthorized"],
      ["ai-consent-consent", 403, "consent_required"],
      ["ai-consent-input-too-large", 413, "input_too_large"],
      ["ai-consent-daily-rate-limit", 429, "rate_limit_exceeded"],
      ["ai-consent-quota", 429, "quota_exceeded"],
      ["ai-consent-concurrency", 429, "concurrency_exceeded"],
      ["ai-consent-budget", 429, "budget_exceeded"],
      ["ai-consent-hard-cap", 429, "hard_cap_exceeded"],
      ["ai-consent-timeout", 504, "provider_timeout"],
      ["ai-consent-provider", 502, "provider_error"],
      ["ai-consent-configuration", 503, "configuration_error"],
      ["ai-consent-server-error", 500, "provider_error"],
      ["ai-consent-offline", 503, "offline"],
    ] as const;

    for (const [fixture, status, code] of expectations) {
      expect(applyAiConsentFixtureMutation(fixture, grantOpenAi)).toMatchObject({ ok: false, error: { status, code } });
    }
  });
});
