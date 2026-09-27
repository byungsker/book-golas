import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { POST, GET } from "./route";
import { resetAiConsentFixtures } from "@/lib/consumer/ai-consent-fixtures";
import { createServerSupabaseClient } from "@/lib/supabase-server";

vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/dal", () => {
  const makeError = (code: string, status: number, message: string, retryable = false) => ({ code, status, message, retryable });
  return {
    consentStatusUnknownError: () => makeError("consent_status_unknown", 503, "Consent status is unknown.", true),
    configurationError: () => makeError("configuration_error", 503, "Configuration is unavailable."),
    conflictError: (message?: string) => makeError("conflict", 409, message ?? "Conflict.", true),
    inputTooLargeError: (message?: string) => makeError("input_too_large", 413, message ?? "Input is too large."),
    mapDatabaseError: (_error: unknown, fallback: unknown) => fallback,
    unauthorizedError: () => makeError("unauthorized", 401, "Sign-in required."),
    unavailableError: (message?: string) => makeError("unavailable", 503, message ?? "Unavailable.", true),
    validationError: (message?: string) => makeError("validation_error", 400, message ?? "Invalid request."),
  };
});

const grantOpenAi = {
  action: "grant",
  locale: "en",
  policyVersion: 2,
  provider: "open_ai",
};

const userId = "00000000-0000-4000-8000-000000000001";
const openAiReceipt = "00000000-0000-4000-8000-000000004381";
const fixtureNow = "2026-09-16T00:00:00.000Z";

function request(method: "GET" | "POST", fixture: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/consumer/ai-consent", {
    method,
    headers: {
      ...(fixture ? { Cookie: `bookgolas-route-fixture=${fixture}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function databaseQuery(data: unknown[]) {
  const result = { data, error: null };
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe("/api/consumer/ai-consent", () => {
  beforeEach(() => {
    resetAiConsentFixtures();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
  });

  it("reads both provider records and returns a provider-specific receipt", async () => {
    const response = await GET(request("GET", "ai-consent-state"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.kind).toBe("snapshot");
    expect(body.policyVersion).toBe(2);
    expect(body.consents).toHaveLength(2);
    expect(body.consents.map((record: { provider: string }) => record.provider)).toEqual(["google_cloud_vision", "open_ai"]);
    expect(body.consents.every((record: { receiptId: string | null }) => record.receiptId)).toBe(true);
  });

  it("grants and withdraws through the private route with no caller ownership field", async () => {
    const granted = await POST(request("POST", "ai-consent-happy", grantOpenAi));
    expect(granted.status).toBe(200);
    expect(await granted.json()).toMatchObject({ kind: "updated", action: "grant", provider: "open_ai", state: "allowed", policyVersion: 2, canSend: true });

    const withdrawn = await POST(request("POST", "ai-consent-happy", { ...grantOpenAi, action: "withdraw" }));
    expect(withdrawn.status).toBe(200);
    expect(await withdrawn.json()).toMatchObject({ kind: "updated", action: "withdraw", provider: "open_ai", state: "not_allowed", canSend: false });

    const foreign = await POST(request("POST", "ai-consent-happy", { ...grantOpenAi, user_id: "foreign-user" }));
    expect(foreign.status).toBe(400);
    expect((await foreign.json()).error.code).toBe("validation_error");
  });

  it("keeps unknown status fail-closed and exposes unavailable status", async () => {
    const unknown = await GET(request("GET", "ai-consent-unknown"));
    expect(unknown.status).toBe(200);
    expect((await unknown.json()).consents.every((record: { state: string; canSend: boolean }) => record.state === "unknown" && !record.canSend)).toBe(true);

    const blocked = await POST(request("POST", "ai-consent-unknown", grantOpenAi));
    expect(blocked.status).toBe(503);
    expect((await blocked.json()).error.code).toBe("consent_status_unknown");

    const unavailable = await GET(request("GET", "ai-consent-status-unavailable"));
    expect(unavailable.status).toBe(200);
    expect((await unavailable.json()).consents.every((record: { state: string; canSend: boolean }) => record.state === "unavailable" && !record.canSend)).toBe(true);
  });

  it("keeps 401, 403, 413, 429 and 5xx errors distinct", async () => {
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
      const response = await POST(request("POST", fixture, grantOpenAi));
      expect(response.status).toBe(status);
      expect((await response.json()).error.code).toBe(code);
    }
  });

  it("derives ownership and reads back provider receipt after grant and withdrawal", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://bookgolas.supabase.co";
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;

    const currentRows: Array<Record<string, unknown>> = [
      {
        provider: "google_cloud_vision",
        policy_version: 2,
        disclosure_locale: "ko-KR",
        granted: false,
        granted_at: null,
        withdrawn_at: fixtureNow,
        updated_at: fixtureNow,
      },
      {
        provider: "open_ai",
        policy_version: 2,
        disclosure_locale: null,
        granted: false,
        granted_at: null,
        withdrawn_at: null,
        updated_at: null,
      },
    ];
    const eventRows: Array<Record<string, unknown>> = [];
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: vi.fn((table: string) => databaseQuery(table === "third_party_ai_consents" ? currentRows : eventRows)),
      rpc: vi.fn().mockImplementation(async (_name: string, args: { p_granted: boolean }) => {
        const openAi = currentRows.find((row) => row.provider === "open_ai");
        if (!openAi) return { data: false, error: null };
        openAi.granted = args.p_granted;
        openAi.granted_at = args.p_granted ? fixtureNow : null;
        openAi.withdrawn_at = args.p_granted ? null : fixtureNow;
        openAi.updated_at = fixtureNow;
        eventRows.unshift({
          id: openAiReceipt,
          provider: "open_ai",
          policy_version: 2,
          disclosure_locale: args.p_granted ? "en-US" : null,
          granted: args.p_granted,
          created_at: fixtureNow,
        });
        return { data: true, error: null };
      }),
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const initial = await GET(request("GET", ""));
    expect(initial.status).toBe(200);
    expect((await initial.json()).consents.find((record: { provider: string }) => record.provider === "open_ai")).toMatchObject({ state: "not_allowed", canSend: false });

    const granted = await POST(request("POST", "", grantOpenAi));
    expect(granted.status).toBe(200);
    expect(await granted.json()).toMatchObject({ provider: "open_ai", state: "allowed", receiptId: openAiReceipt, canSend: true });
    expect(client.rpc).toHaveBeenCalledWith("record_third_party_ai_consent", expect.objectContaining({ p_provider: "open_ai", p_policy_version: 2, p_granted: true, p_disclosure_locale: "en-US" }));
    expect(client.rpc.mock.calls[0][1]).not.toHaveProperty("p_user_id");

    const withdrawn = await POST(request("POST", "", { ...grantOpenAi, action: "withdraw" }));
    expect(withdrawn.status).toBe(200);
    expect(await withdrawn.json()).toMatchObject({ provider: "open_ai", state: "not_allowed", receiptId: openAiReceipt, canSend: false });
    expect(revalidatePath).toHaveBeenCalledWith("/en/account");
  });
});
