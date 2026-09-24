export const THIRD_PARTY_AI_POLICY_VERSION = 2;
export const THIRD_PARTY_AI_CONSENT_VERSION = "third-party-ai-v2";

export const THIRD_PARTY_AI_PROVIDER_KINDS = {
  google_cloud_vision: "ocr",
  open_ai: "ai",
} as const;

export type ThirdPartyAiProvider = keyof typeof THIRD_PARTY_AI_PROVIDER_KINDS;
export type ThirdPartyAiConsentState =
  | "granted"
  | "revoked"
  | "unknown"
  | "unavailable";

type ConsentResult = {
  readonly data: unknown;
  readonly error: unknown;
};

interface ConsentFilter {
  eq(column: string, value: unknown): ConsentFilter;
  maybeSingle(): PromiseLike<ConsentResult>;
}

export interface ThirdPartyAiConsentClient {
  from(relation: string): {
    select(columns: string): ConsentFilter;
  };
}

export type ThirdPartyAiConsentDecision = {
  readonly provider: ThirdPartyAiProvider;
  readonly kind: "ai" | "ocr";
  readonly state: ThirdPartyAiConsentState;
  readonly canSend: boolean;
  readonly reason:
    | "canonical_grant"
    | "canonical_revocation"
    | "missing_canonical_state"
    | "stale_policy"
    | "consent_store_unavailable";
};

export type ThirdPartyAiOperationResult<T> =
  | { readonly allowed: true; readonly value: T }
  | { readonly allowed: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readThirdPartyAiConsent(
  client: ThirdPartyAiConsentClient,
  userId: string,
  provider: ThirdPartyAiProvider,
): Promise<ThirdPartyAiConsentDecision> {
  const kind = THIRD_PARTY_AI_PROVIDER_KINDS[provider];
  try {
    const { data, error } = await client
      .from("user_consents")
      .select("status, version")
      .eq("user_id", userId)
      .eq("kind", kind)
      .maybeSingle();

    if (error !== null && error !== undefined) {
      return { provider, kind, state: "unavailable", canSend: false, reason: "consent_store_unavailable" };
    }
    if (!isRecord(data)) {
      return { provider, kind, state: "unknown", canSend: false, reason: "missing_canonical_state" };
    }
    if (data.status !== "granted") {
      return { provider, kind, state: "revoked", canSend: false, reason: "canonical_revocation" };
    }
    if (data.version !== THIRD_PARTY_AI_CONSENT_VERSION) {
      return { provider, kind, state: "unknown", canSend: false, reason: "stale_policy" };
    }
    return { provider, kind, state: "granted", canSend: true, reason: "canonical_grant" };
  } catch (error) {
    if (error instanceof Error) {
      return { provider, kind, state: "unavailable", canSend: false, reason: "consent_store_unavailable" };
    }
    return { provider, kind, state: "unavailable", canSend: false, reason: "consent_store_unavailable" };
  }
}

export async function hasThirdPartyAiConsent(
  client: ThirdPartyAiConsentClient,
  userId: string,
  provider: ThirdPartyAiProvider,
): Promise<boolean> {
  return (await readThirdPartyAiConsent(client, userId, provider)).canSend;
}

export async function executeThirdPartyAiOperation<T>(
  client: ThirdPartyAiConsentClient,
  userId: string,
  provider: ThirdPartyAiProvider,
  operation: () => Promise<T>,
): Promise<ThirdPartyAiOperationResult<T>> {
  const decision = await readThirdPartyAiConsent(client, userId, provider);
  if (!decision.canSend) return { allowed: false };
  return { allowed: true, value: await operation() };
}

export function thirdPartyAiConsentRequiredResponse(
  corsHeaders: Readonly<Record<string, string>> = {},
): Response {
  return new Response(
    JSON.stringify({ error: "third_party_ai_consent_required" }),
    {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}
