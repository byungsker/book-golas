export type ThirdPartyAiProvider = "google_cloud_vision" | "open_ai";

type ConsentResult = {
  data: { granted?: unknown; policy_version?: unknown } | null;
  error: unknown;
};

type ConsentFilter = {
  eq(column: string, value: unknown): ConsentFilter;
  maybeSingle(): PromiseLike<ConsentResult>;
};

export type ThirdPartyAiConsentClient = {
  from(relation: string): {
    select(columns: string): ConsentFilter;
  };
};

export const THIRD_PARTY_AI_POLICY_VERSION = 1;

export async function hasThirdPartyAiConsent(
  client: unknown,
  userId: string,
  provider: ThirdPartyAiProvider,
): Promise<boolean> {
  try {
    const consentClient = client as ThirdPartyAiConsentClient;
    const { data, error } = await consentClient
      .from("third_party_ai_consents")
      .select("granted, policy_version")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    return error == null && data?.granted === true &&
      data.policy_version === THIRD_PARTY_AI_POLICY_VERSION;
  } catch {
    return false;
  }
}

export function thirdPartyAiConsentRequiredResponse(
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({ error: "third_party_ai_consent_required" }),
    {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}
