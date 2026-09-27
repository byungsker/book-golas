import { z } from "zod";
import {
  ApiErrorResponseSchema,
  IsoDateSchema,
  LocaleSchema,
  RecordIdSchema,
} from "./common";

/** Keep this in lockstep with the native ThirdPartyAiConsentService policy. */
export const AI_CONSENT_POLICY_VERSION = 2 as const;

export const aiProviderValues = ["google_cloud_vision", "open_ai"] as const;
export const AiProviderSchema = z.enum(aiProviderValues);
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const aiConsentActionValues = ["grant", "withdraw"] as const;
export const AiConsentActionSchema = z.enum(aiConsentActionValues);
export type AiConsentAction = z.infer<typeof AiConsentActionSchema>;

/** JSON names mirror the native states while making an absent record explicit. */
export const aiConsentStateValues = [
  "allowed",
  "not_allowed",
  "unknown",
  "unavailable",
] as const;
export const AiConsentStateSchema = z.enum(aiConsentStateValues);
export type AiConsentState = z.infer<typeof AiConsentStateSchema>;

export const aiOperationalErrorCodeValues = [
  "validation_error",
  "insufficient_data",
  "unauthorized",
  "consent_required",
  "payload_too_large",
  "input_too_large",
  "rate_limit_exceeded",
  "quota_exceeded",
  "concurrency_exceeded",
  "budget_exceeded",
  "hard_cap_exceeded",
  "provider_timeout",
  "provider_error",
  "configuration_error",
  "offline",
  "consent_status_unknown",
] as const;
export const AiOperationalErrorCodeSchema = z.enum(aiOperationalErrorCodeValues);
export type AiOperationalErrorCode = z.infer<typeof AiOperationalErrorCodeSchema>;

export const aiOperationalStateValues = [
  "idle",
  "loading",
  "success",
  "unknown",
  "unauthorized",
  "consent_required",
  "insufficient_data",
  "input_too_large",
  "rate_limit_exceeded",
  "quota_exceeded",
  "concurrency_exceeded",
  "budget_exceeded",
  "hard_cap_exceeded",
  "provider_timeout",
  "provider_error",
  "configuration_error",
  "offline",
] as const;
export const AiOperationalStateSchema = z.enum(aiOperationalStateValues);
export type AiOperationalState = z.infer<typeof AiOperationalStateSchema>;

export const AiConsentDisclosureSchema = z
  .object({
    locale: z.string().trim().min(2).max(20),
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(2_000),
    providerScope: z.string().trim().min(1).max(2_000),
    triggerContext: z
      .object({
        feature: z.string().trim().min(1).max(500),
        data: z.string().trim().min(1).max(2_000),
      })
      .strict(),
    dataDescription: z.string().trim().min(1).max(8_000),
    optionalNotice: z.string().trim().min(1).max(2_000),
    recipient: z.string().trim().min(1).max(500),
  })
  .strict();
export type AiConsentDisclosure = z.infer<typeof AiConsentDisclosureSchema>;

export const AiConsentMutationRequestSchema = z
  .object({
    action: AiConsentActionSchema,
    locale: LocaleSchema,
    policyVersion: z.literal(AI_CONSENT_POLICY_VERSION),
    provider: AiProviderSchema,
  })
  .strict();
export type AiConsentMutationRequest = z.infer<typeof AiConsentMutationRequestSchema>;

export const AiConsentRecordSchema = z
  .object({
    provider: AiProviderSchema,
    state: AiConsentStateSchema,
    policyVersion: z.number().int().positive().nullable(),
    receiptId: RecordIdSchema.nullable(),
    disclosureLocale: z.string().trim().min(1).max(20).nullable(),
    grantedAt: IsoDateSchema.nullable(),
    withdrawnAt: IsoDateSchema.nullable(),
    updatedAt: IsoDateSchema.nullable(),
    canSend: z.boolean(),
  })
  .strict();
export type AiConsentRecord = z.infer<typeof AiConsentRecordSchema>;

export const AiConsentSnapshotSchema = z
  .object({
    kind: z.literal("snapshot"),
    policyVersion: z.literal(AI_CONSENT_POLICY_VERSION),
    consents: z.array(AiConsentRecordSchema).length(aiProviderValues.length),
  })
  .strict();
export type AiConsentSnapshot = z.infer<typeof AiConsentSnapshotSchema>;

export const AiConsentMutationSuccessSchema = z
  .object({
    kind: z.literal("updated"),
    action: AiConsentActionSchema,
    provider: AiProviderSchema,
    policyVersion: z.literal(AI_CONSENT_POLICY_VERSION),
    state: z.enum(["allowed", "not_allowed"]),
    receiptId: RecordIdSchema.nullable(),
    updatedAt: IsoDateSchema,
    canSend: z.boolean(),
  })
  .strict();
export type AiConsentMutationSuccess = z.infer<typeof AiConsentMutationSuccessSchema>;

export const AiConsentResponseSchema = z.discriminatedUnion("kind", [
  AiConsentSnapshotSchema,
  AiConsentMutationSuccessSchema,
]);
export type AiConsentResponse = z.infer<typeof AiConsentResponseSchema>;

export const AiConsentErrorResponseSchema = ApiErrorResponseSchema;

/** The UI uses these mappings for feature errors without turning operational limits into billing. */
export const AI_OPERATIONAL_ERROR_MATRIX: readonly Readonly<{
  code: AiOperationalErrorCode;
  status: 400 | 401 | 403 | 413 | 429 | 500 | 502 | 503 | 504;
  state: AiOperationalState;
}>[] = Object.freeze([
  { code: "validation_error", status: 400, state: "insufficient_data" },
  { code: "insufficient_data", status: 400, state: "insufficient_data" },
  { code: "unauthorized", status: 401, state: "unauthorized" },
  { code: "consent_required", status: 403, state: "consent_required" },
  { code: "payload_too_large", status: 413, state: "input_too_large" },
  { code: "input_too_large", status: 413, state: "input_too_large" },
  { code: "rate_limit_exceeded", status: 429, state: "rate_limit_exceeded" },
  { code: "quota_exceeded", status: 429, state: "quota_exceeded" },
  { code: "concurrency_exceeded", status: 429, state: "concurrency_exceeded" },
  { code: "budget_exceeded", status: 429, state: "budget_exceeded" },
  { code: "hard_cap_exceeded", status: 429, state: "hard_cap_exceeded" },
  { code: "provider_timeout", status: 504, state: "provider_timeout" },
  { code: "provider_error", status: 502, state: "provider_error" },
  { code: "configuration_error", status: 503, state: "configuration_error" },
  { code: "offline", status: 503, state: "offline" },
  { code: "consent_status_unknown", status: 503, state: "unknown" },
]);

export function consentStateForRecord(input: {
  granted?: unknown;
  policyVersion?: unknown;
} | null): AiConsentState {
  if (!input) return "unknown";
  if (input.granted === true && input.policyVersion === AI_CONSENT_POLICY_VERSION) {
    return "allowed";
  }
  return "not_allowed";
}

export function canSendToAiProvider(state: AiConsentState): boolean {
  return state === "allowed";
}

export function mapAiOperationalError(input: {
  code?: unknown;
  status?: unknown;
}): AiOperationalState {
  const code = typeof input.code === "string" ? input.code : "";
  if (code === "consent_status_unknown") return "unknown";
  if (aiOperationalStateValues.includes(code as AiOperationalState)) {
    return code as AiOperationalState;
  }
  if (input.status === 401) return "unauthorized";
  if (input.status === 403) return "consent_required";
  if (input.status === 413) return "input_too_large";
  if (input.status === 429) return "quota_exceeded";
  if (input.status === 504) return "provider_timeout";
  if (typeof input.status === "number" && input.status >= 500) return "provider_error";
  return "insufficient_data";
}
