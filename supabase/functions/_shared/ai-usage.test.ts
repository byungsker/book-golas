import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_MAX_INPUT_CHARS,
  AiUsageError,
  assertAiInputSize,
  consumeAiBudget,
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
