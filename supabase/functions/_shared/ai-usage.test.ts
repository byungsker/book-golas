import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_MAX_INPUT_CHARS,
  AiUsageError,
  aiUsageErrorResponse,
  assertAiInputSize,
  consumeAiBudget,
  fetchAiProvider,
  withAiBudget,
} from "./ai-usage.ts";

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
        name === "consume_ai_usage"
          ? { data: { allowed: true, leaseId: "lease-success" }, error: null }
          : { data: true, error: null },
      );
    },
  } as unknown as SupabaseClient;

  await withAiBudget(client, 10, async () => "ok");
  assertEquals(calls, ["consume_ai_usage", "release_ai_usage"]);
});

Deno.test("AI budget releases a lease after a failed provider operation", async () => {
  const calls: string[] = [];
  const client = {
    rpc: (name: string) => {
      calls.push(name);
      return Promise.resolve(
        name === "consume_ai_usage"
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
  assertEquals(calls, ["consume_ai_usage", "release_ai_usage"]);
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
