import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  AI_CONSENT_POLICY_VERSION,
  AiConsentMutationRequestSchema,
  AiConsentRecordSchema,
  AiConsentSnapshotSchema,
  AiProviderSchema,
  canSendToAiProvider,
  consentStateForRecord,
  type AiConsentResponse,
  type AiConsentSnapshot,
  type AiProvider,
} from "@/lib/product/contracts";
import { getAiConsentDisclosure } from "@/lib/consumer/ai-consent-disclosures";
import {
  applyAiConsentFixtureMutation,
  getAiConsentFixture,
} from "@/lib/consumer/ai-consent-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  consentStatusUnknownError,
  configurationError,
  conflictError,
  inputTooLargeError,
  mapDatabaseError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal";

const MAX_BODY_BYTES = 64 * 1024;
const providers: readonly AiProvider[] = ["google_cloud_vision", "open_ai"];

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type Row = Record<string, unknown>;

function privateJson(body: AiConsentResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  return NextResponse.json({ error }, {
    status: error.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function fixtureFor(request: NextRequest): string | null {
  return getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
}

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function recordByProvider(rows: unknown): Map<AiProvider, Row> {
  const result = new Map<AiProvider, Row>();
  if (!Array.isArray(rows)) return result;
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const parsedProvider = AiProviderSchema.safeParse(row.provider);
    if (parsedProvider.success) result.set(parsedProvider.data, row);
  }
  return result;
}

async function readSnapshot(
  supabase: ServerClient,
  userId: string,
): Promise<ProductResult<AiConsentSnapshot>> {
  try {
    const [currentResult, eventResult] = await Promise.all([
      supabase
        .from("third_party_ai_consents")
        .select("provider,policy_version,disclosure_locale,granted,granted_at,withdrawn_at,updated_at")
        .eq("user_id", userId),
      supabase
        .from("third_party_ai_consent_events")
        .select("id,provider,policy_version,disclosure_locale,granted,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (currentResult.error || eventResult.error) {
      return {
        ok: false,
        error: configurationError("AI consent storage is unavailable."),
      };
    }

    const current = recordByProvider(currentResult.data);
    const latestEvents = new Map<AiProvider, Row>();
    for (const row of Array.isArray(eventResult.data) ? eventResult.data : []) {
      if (!isRecord(row)) continue;
      const parsedProvider = AiProviderSchema.safeParse(row.provider);
      if (parsedProvider.success && !latestEvents.has(parsedProvider.data)) {
        latestEvents.set(parsedProvider.data, row);
      }
    }

    const consents = providers.map((provider) => {
      const row = current.get(provider);
      const event = latestEvents.get(provider);
      const state = consentStateForRecord(row ? {
        granted: row.granted,
        policyVersion: row.policy_version,
      } : null);
      const record = AiConsentRecordSchema.safeParse({
        provider,
        state,
        policyVersion: typeof row?.policy_version === "number" ? row.policy_version : null,
        receiptId: stringValue(event?.id),
        disclosureLocale: stringValue(row?.disclosure_locale) ?? stringValue(event?.disclosure_locale),
        grantedAt: stringValue(row?.granted_at),
        withdrawnAt: stringValue(row?.withdrawn_at),
        updatedAt: stringValue(row?.updated_at),
        canSend: canSendToAiProvider(state),
      });
      return record;
    });

    if (consents.some((record) => !record.success)) {
      return { ok: false, error: unavailableError("AI consent data is malformed.") };
    }

    return {
      ok: true,
      value: AiConsentSnapshotSchema.parse({
        kind: "snapshot",
        policyVersion: AI_CONSENT_POLICY_VERSION,
        consents: consents.map((record) => record.data),
      }),
    };
  } catch {
    return { ok: false, error: configurationError("AI consent storage is unavailable.") };
  }
}

async function authenticatedClient(): Promise<
  | { ok: true; supabase: ServerClient; userId: string }
  | { ok: false; error: ProductError }
> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return { ok: false, error: unauthorizedError() };
    if (!user) return { ok: false, error: unauthorizedError() };
    return { ok: true, supabase, userId: user.id };
  } catch {
    return { ok: false, error: configurationError() };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fixture = fixtureFor(request);
  if (fixture?.startsWith("ai-consent-")) {
    const result = getAiConsentFixture(fixture);
    return result.ok ? privateJson(result.value) : privateError(result.error);
  }

  const context = await authenticatedClient();
  if (!context.ok) return privateError(context.error);
  const result = await readSnapshot(context.supabase, context.userId);
  return result.ok ? privateJson(result.value) : privateError(result.error);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_BODY_BYTES) {
      return privateError(inputTooLargeError("The consent request is too large."));
    }
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return privateError(inputTooLargeError("The consent request is too large."));
    }
    body = JSON.parse(rawBody);
  } catch {
    return privateError(validationError("The consent request is invalid."));
  }

  const parsed = AiConsentMutationRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError("The consent request is invalid."));

  const fixture = fixtureFor(request);
  if (fixture?.startsWith("ai-consent-")) {
    const result = applyAiConsentFixtureMutation(fixture, parsed.data);
    return result.ok ? privateJson(result.value) : privateError(result.error);
  }

  const context = await authenticatedClient();
  if (!context.ok) return privateError(context.error);

  const disclosure = getAiConsentDisclosure(parsed.data.provider, parsed.data.locale);
  let rpcResult: { data: unknown; error: unknown };
  try {
    rpcResult = await context.supabase.rpc("record_third_party_ai_consent", {
      p_provider: parsed.data.provider,
      p_policy_version: AI_CONSENT_POLICY_VERSION,
      p_granted: parsed.data.action === "grant",
      ...(parsed.data.action === "grant"
        ? {
            p_disclosure_locale: disclosure.locale,
            p_disclosure_snapshot: disclosure,
          }
        : {}),
    });
  } catch {
    return privateError(consentStatusUnknownError());
  }
  if (rpcResult.error) {
    return privateError(mapDatabaseError(rpcResult.error, consentStatusUnknownError()));
  }
  if (rpcResult.data !== true) {
    return privateError(conflictError("There is no saved consent to withdraw."));
  }

  const snapshot = await readSnapshot(context.supabase, context.userId);
  if (!snapshot.ok) return privateError(snapshot.error);
  const record = snapshot.value.consents.find((item) => item.provider === parsed.data.provider);
  if (!record || (parsed.data.action === "grant" && record.state !== "allowed") || (parsed.data.action === "withdraw" && record.state === "allowed")) {
    return privateError(consentStatusUnknownError());
  }

  revalidatePath(`/${parsed.data.locale}/account`);
  return privateJson({
    kind: "updated",
    action: parsed.data.action,
    provider: parsed.data.provider,
    policyVersion: AI_CONSENT_POLICY_VERSION,
    state: parsed.data.action === "grant" ? "allowed" : "not_allowed",
    receiptId: record.receiptId,
    updatedAt: record.updatedAt ?? new Date().toISOString(),
    canSend: parsed.data.action === "grant",
  });
}
