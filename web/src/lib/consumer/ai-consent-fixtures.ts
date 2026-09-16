import {
  AI_CONSENT_POLICY_VERSION,
  AiConsentMutationRequestSchema,
  AiConsentMutationSuccessSchema,
  AiConsentRecordSchema,
  AiConsentSnapshotSchema,
  type AiConsentMutationRequest,
  type AiConsentMutationSuccess,
  type AiConsentRecord,
  type AiConsentSnapshot,
  type AiProvider,
} from "@/lib/product/contracts";
import {
  budgetExceededError,
  configurationError,
  consentRequiredError,
  consentStatusUnknownError,
  concurrencyExceededError,
  failure,
  forbiddenError,
  hardCapExceededError,
  inputTooLargeError,
  insufficientDataError,
  offlineError,
  providerError,
  providerTimeoutError,
  quotaExceededError,
  rateLimitExceededError,
  unauthorizedError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";

const fixtureNow = "2026-09-16T00:00:00.000Z";
const fixtureUserId = "00000000-0000-4000-8000-000000000001";

const providerReceiptIds: Record<AiProvider, string> = {
  open_ai: "00000000-0000-4000-8000-000000004381",
  google_cloud_vision: "00000000-0000-4000-8000-000000004382",
};

type FixtureState = {
  readonly provider: AiProvider;
  state: AiConsentRecord["state"];
  policyVersion: number | null;
  receiptId: string | null;
  grantedAt: string | null;
  withdrawnAt: string | null;
};

const providerOrder: readonly AiProvider[] = ["google_cloud_vision", "open_ai"];

function initialState(fixture: string): Record<AiProvider, FixtureState> {
  const isAllowed = fixture === "ai-consent-state" || fixture === "ai-consent-receipt";
  const isUnavailable = fixture === "ai-consent-status-unavailable";
  const isUnknown = fixture === "ai-consent-unknown";
  return {
    google_cloud_vision: {
      provider: "google_cloud_vision",
      state: isUnavailable ? "unavailable" : isUnknown ? "unknown" : isAllowed ? "allowed" : "not_allowed",
      policyVersion: isUnavailable || isUnknown ? null : AI_CONSENT_POLICY_VERSION,
      receiptId: isAllowed ? providerReceiptIds.google_cloud_vision : null,
      grantedAt: isAllowed ? fixtureNow : null,
      withdrawnAt: isAllowed ? null : null,
    },
    open_ai: {
      provider: "open_ai",
      state: isUnavailable ? "unavailable" : isUnknown ? "unknown" : isAllowed ? "allowed" : "not_allowed",
      policyVersion: isUnavailable || isUnknown ? null : AI_CONSENT_POLICY_VERSION,
      receiptId: isAllowed ? providerReceiptIds.open_ai : null,
      grantedAt: isAllowed ? fixtureNow : null,
      withdrawnAt: null,
    },
  };
}

const states = new Map<string, Record<AiProvider, FixtureState>>();

function stateFor(fixture: string): Record<AiProvider, FixtureState> {
  const current = states.get(fixture);
  if (current) return current;
  const created = initialState(fixture);
  states.set(fixture, created);
  return created;
}

function recordFor(state: FixtureState): AiConsentRecord {
  return AiConsentRecordSchema.parse({
    provider: state.provider,
    state: state.state,
    policyVersion: state.policyVersion,
    receiptId: state.receiptId,
    disclosureLocale: state.receiptId ? "en-US" : null,
    grantedAt: state.grantedAt,
    withdrawnAt: state.withdrawnAt,
    updatedAt: state.receiptId || state.withdrawnAt ? fixtureNow : null,
    canSend: state.state === "allowed",
  });
}

function snapshotFor(fixture: string): AiConsentSnapshot {
  return AiConsentSnapshotSchema.parse({
    kind: "snapshot",
    policyVersion: AI_CONSENT_POLICY_VERSION,
    consents: providerOrder.map((provider) => recordFor(stateFor(fixture)[provider])),
  });
}

function errorForMutationFixture(fixture: string): ProductError | null {
  if (fixture === "ai-consent-unauthorized") return unauthorizedError();
  if (fixture === "ai-consent-consent") return consentRequiredError("AI provider consent is required.");
  if (fixture === "ai-consent-input-too-large") return inputTooLargeError("AI input exceeds the 20,000 character limit.");
  if (fixture === "ai-consent-insufficient-data") return insufficientDataError("Save a reading record before requesting an AI result.");
  if (fixture === "ai-consent-daily-rate-limit") return rateLimitExceededError("The daily AI request rate limit was reached.");
  if (fixture === "ai-consent-quota") return quotaExceededError("The daily AI request quota was reached.");
  if (fixture === "ai-consent-concurrency") return concurrencyExceededError("The maximum number of concurrent AI requests is running.");
  if (fixture === "ai-consent-budget") return budgetExceededError("The daily AI budget was reached.");
  if (fixture === "ai-consent-hard-cap") return hardCapExceededError("The daily AI safety cap was reached.");
  if (fixture === "ai-consent-timeout") return providerTimeoutError("The AI provider timed out.");
  if (fixture === "ai-consent-provider") return providerError("The AI provider returned an error.");
  if (fixture === "ai-consent-configuration") return configurationError("The AI provider is not configured.");
  if (fixture === "ai-consent-offline") return offlineError("The AI request is offline.");
  if (fixture === "ai-consent-server-error") return { ...providerError("The AI service failed."), status: 500 };
  if (fixture === "ai-consent-foreign") return forbiddenError("The provider consent belongs to another account.");
  return null;
}

export function resetAiConsentFixtures(): void {
  states.clear();
}

export function getAiConsentFixture(
  fixture: string,
): ProductResult<AiConsentSnapshot> {
  if (fixture === "ai-consent-unauthorized") return failure(unauthorizedError());
  if (fixture === "ai-consent-status-unavailable") {
    const snapshot = snapshotFor(fixture);
    return { ok: true, value: snapshot };
  }
  return { ok: true, value: snapshotFor(fixture) };
}

export function applyAiConsentFixtureMutation(
  fixture: string,
  input: AiConsentMutationRequest,
): ProductResult<AiConsentMutationSuccess> {
  const parsed = AiConsentMutationRequestSchema.safeParse(input);
  if (!parsed.success) return failure(insufficientDataError("The consent request is invalid."));

  if (fixture === "ai-consent-unknown") return failure(consentStatusUnknownError("The saved consent could not be confirmed."));
  const error = errorForMutationFixture(fixture);
  if (error) return failure(error);

  const state = stateFor(fixture)[parsed.data.provider];
  const receiptId = state.receiptId ?? providerReceiptIds[parsed.data.provider];
  if (parsed.data.action === "grant") {
    state.state = "allowed";
    state.policyVersion = AI_CONSENT_POLICY_VERSION;
    state.receiptId = receiptId;
    state.grantedAt = fixtureNow;
    state.withdrawnAt = null;
  } else {
    state.state = "not_allowed";
    state.policyVersion = state.policyVersion ?? AI_CONSENT_POLICY_VERSION;
    state.receiptId = receiptId;
    state.withdrawnAt = fixtureNow;
  }

  return {
    ok: true,
    value: AiConsentMutationSuccessSchema.parse({
      kind: "updated",
      action: parsed.data.action,
      provider: parsed.data.provider,
      policyVersion: AI_CONSENT_POLICY_VERSION,
      state: state.state === "allowed" ? "allowed" : "not_allowed",
      receiptId: state.receiptId,
      updatedAt: fixtureNow,
      canSend: state.state === "allowed",
    }),
  };
}

export function aiConsentMutationFixtureError(fixture: string): ProductError | null {
  return errorForMutationFixture(fixture);
}

export const AI_CONSENT_FIXTURE_USER_ID = fixtureUserId;
