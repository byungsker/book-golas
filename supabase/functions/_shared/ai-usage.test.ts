import {
  assert,
  assertEquals,
  assertRejects,
  assertThrows,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiUsageControlEventRow,
  AiUsageLogRow,
} from "./ai-usage-contract.ts";
import {
  AI_MAX_INPUT_CHARS,
  AiUsageError,
  aiUsageErrorResponse,
  assertAiInputSize,
  consumeAiBudget,
  createAiProviderRunner,
  fetchAiProvider,
  withAiBudget,
  withTrackedAiBudget,
} from "./ai-usage.ts";

class MockUsageClient {
  logs: AiUsageLogRow[] = [];
  events: AiUsageControlEventRow[] = [];

  from(table: string) {
    return {
      insert: (row: AiUsageLogRow | AiUsageControlEventRow) => {
        if (table === "ai_usage_logs") this.logs.push(row as AiUsageLogRow);
        if (table === "ai_usage_control_events") {
          this.events.push(row as AiUsageControlEventRow);
        }
        return Promise.resolve({ error: null });
      },
    };
  }
}

function trackedContext() {
  return {
    functionName: "test-function",
    feature: "test-feature",
    provider: "open_ai" as const,
    model: "gpt-4o-mini",
    promptVersion: "test-v1",
    requestId: "request-1",
    callId: "call-1",
    maxOutputTokens: 100,
    requireOutputTokens: true,
  };
}

Deno.test("AI input boundary accepts the configured maximum", () => {
  assertAiInputSize(AI_MAX_INPUT_CHARS);
});

Deno.test("AI budget lookup fails closed when the RPC is unavailable", async () => {
  const client = {
    rpc: () => Promise.resolve({ data: null, error: new Error("offline") }),
  } as unknown as SupabaseClient;
  const error = await assertRejects(() => consumeAiBudget(client, 10));
  assertEquals(error instanceof AiUsageError, true);
  assertEquals((error as AiUsageError).code, "budget_unavailable");
  assertEquals((error as AiUsageError).status, 503);
});

Deno.test("AI input boundary rejects oversized and invalid values", () => {
  for (const value of [AI_MAX_INPUT_CHARS + 1, Number.NaN, -1]) {
    const error = assertThrows(() => assertAiInputSize(value));
    assertEquals(error instanceof AiUsageError, true);
    assertEquals((error as AiUsageError).code, "input_too_large");
  }
});

Deno.test("AI budget releases a lease after a successful provider operation", async () => {
  const calls: string[] = [];
  const client = {
    rpc: (name: string) => {
      calls.push(name);
      return Promise.resolve(
        name === "reserve_ai_usage"
          ? { data: { allowed: true, leaseId: "lease-success" }, error: null }
          : { data: true, error: null },
      );
    },
  } as unknown as SupabaseClient;

  await withAiBudget(client, 10, async () => "ok");
  assertEquals(calls, ["reserve_ai_usage", "release_ai_usage"]);
});

Deno.test("AI budget releases a lease after a failed provider operation", async () => {
  const calls: string[] = [];
  const client = {
    rpc: (name: string) => {
      calls.push(name);
      return Promise.resolve(
        name === "reserve_ai_usage"
          ? { data: { allowed: true, leaseId: "lease-failure" }, error: null }
          : { data: true, error: null },
      );
    },
  } as unknown as SupabaseClient;

  await assertRejects(
    () =>
      withAiBudget(client, 10, async () => {
        throw new Error("provider failed");
      }),
    Error,
    "provider failed",
  );
  assertEquals(calls, ["reserve_ai_usage", "release_ai_usage"]);
});

Deno.test("blocked reservations do not invoke the provider", async () => {
  let providerCalls = 0;
  const client = {
    rpc: (name: string) =>
      Promise.resolve(
        name === "reserve_ai_usage"
          ? {
            data: { allowed: false, reason: "hard_cap_exceeded" },
            error: null,
          }
          : { data: true, error: null },
      ),
  } as unknown as SupabaseClient;
  const logClient = new MockUsageClient();

  const error = await assertRejects(
    () =>
      withTrackedAiBudget(
        client,
        logClient,
        "user-1",
        10,
        trackedContext(),
        async () => {
          providerCalls += 1;
          return {
            value: "never",
            usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
          };
        },
      ),
  );
  assertEquals((error as AiUsageError).code, "hard_cap_exceeded");
  assertEquals(providerCalls, 0);
  assertEquals(logClient.logs.length, 0);
});

Deno.test("successful provider calls record finalized usage", async () => {
  const client = {
    rpc: (name: string) =>
      Promise.resolve(
        name === "reserve_ai_usage"
          ? { data: { allowed: true, leaseId: "lease-1" }, error: null }
          : { data: true, error: null },
      ),
  } as unknown as SupabaseClient;
  const logClient = new MockUsageClient();

  const value = await withTrackedAiBudget(
    client,
    logClient,
    "user-1",
    10,
    trackedContext(),
    async () => ({
      value: "answer",
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    }),
  );
  assertEquals(value, "answer");
  assertEquals(logClient.logs.length, 1);
  assertEquals(logClient.logs[0].pricing_status, "finalized");
  assertEquals(logClient.logs[0].token_status, "valid");
  assertEquals(logClient.logs[0].request_id, "request-1");
  assertEquals(logClient.logs[0].call_id, "call-1");
  assertEquals(logClient.events.length, 0);
});

Deno.test("repeated runner calls receive distinct call IDs", async () => {
  const client = {
    rpc: (name: string) =>
      Promise.resolve(
        name === "reserve_ai_usage"
          ? { data: { allowed: true, leaseId: "lease-repeat" }, error: null }
          : { data: true, error: null },
      ),
  } as unknown as SupabaseClient;
  const logClient = new MockUsageClient();
  const runner = createAiProviderRunner(client, logClient, "user-1", "request-repeat");
  const context = { ...trackedContext(), callId: undefined };

  await runner("first", context, async () => ({
    value: "first",
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
  }));
  await runner("second", context, async () => ({
    value: "second",
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
  }));

  assertEquals(logClient.logs.length, 2);
  assertEquals(logClient.logs[0].request_id, "request-repeat");
  assertEquals(logClient.logs[1].request_id, "request-repeat");
  assert(typeof logClient.logs[0].call_id === "string");
  assert(typeof logClient.logs[1].call_id === "string");
  assertNotEquals(logClient.logs[0].call_id, logClient.logs[1].call_id);
});

Deno.test("provider failures and rejected usage record bounded events", async () => {
  const client = {
    rpc: (name: string) =>
      Promise.resolve(
        name === "reserve_ai_usage"
          ? { data: { allowed: true, leaseId: "lease-2" }, error: null }
          : { data: true, error: null },
      ),
  } as unknown as SupabaseClient;
  const providerErrorLogs = new MockUsageClient();
  const providerError = await assertRejects(
    () =>
      withTrackedAiBudget(
        client,
        providerErrorLogs,
        "user-1",
        10,
        trackedContext(),
        async () => {
          throw new Error("provider payload must not be stored");
        },
      ),
  );
  assertEquals((providerError as AiUsageError).code, "provider_error");
  assertEquals(providerErrorLogs.logs[0].pricing_status, "not_finalized");
  assertEquals(providerErrorLogs.logs[0].request_id, "request-1");
  assertEquals(providerErrorLogs.logs[0].call_id, "call-1");
  assertEquals(providerErrorLogs.events[0].event_type, "provider_error");
  assertEquals(providerErrorLogs.events[0].request_id, "request-1");
  assertEquals(providerErrorLogs.events[0].call_id, "call-1");
  assertEquals(providerErrorLogs.events[0].reason, "provider_error");

  const rejectedUsageLogs = new MockUsageClient();
  const rejectedUsage = await assertRejects(
    () =>
      withTrackedAiBudget(
        client,
        rejectedUsageLogs,
        "user-1",
        10,
        trackedContext(),
        async () => ({ value: "invalid", usage: undefined }),
      ),
  );
  assertEquals((rejectedUsage as AiUsageError).code, "invalid_token_usage");
  assertEquals(rejectedUsageLogs.logs[0].error_code, "invalid_token_usage");
  assertEquals(rejectedUsageLogs.events[0].event_type, "usage_rejected");
  assertEquals(rejectedUsageLogs.events[0].reason, "invalid_token_usage");
});

Deno.test("provider timeout errors return a stable 503 response", async () => {
  const response = aiUsageErrorResponse(
    new AiUsageError("provider_timeout", 503),
    { "Access-Control-Allow-Origin": "*" },
  );
  assertEquals(response?.status, 503);
  assertEquals(await response?.json(), { error: "provider_timeout" });
});

Deno.test("provider aborts normalize through the actual fetch boundary", async () => {
  const controller = new AbortController();
  controller.abort();
  const error = await assertRejects(
    () =>
      fetchAiProvider("data:text/plain,ok", { signal: controller.signal }, 10),
  );
  assertEquals(error instanceof AiUsageError, true);
  assertEquals((error as AiUsageError).code, "provider_timeout");
  assertEquals((error as AiUsageError).status, 503);
});

Deno.test("generic LangChain timeout errors normalize to provider timeout", async () => {
  const response = aiUsageErrorResponse(
    new Error("Request timed out in AsyncCaller"),
    {},
  );
  assertEquals(response?.status, 503);
  assertEquals(await response?.json(), { error: "provider_timeout" });
});
