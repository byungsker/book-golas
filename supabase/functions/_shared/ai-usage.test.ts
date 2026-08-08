import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  AI_MAX_INPUT_CHARS,
  AiUsageError,
  assertAiInputSize,
} from "./ai-usage.ts";

Deno.test("AI input boundary accepts the configured maximum", () => {
  assertAiInputSize(AI_MAX_INPUT_CHARS);
});

Deno.test("AI input boundary rejects oversized and invalid values", () => {
  for (const value of [AI_MAX_INPUT_CHARS + 1, Number.NaN, -1]) {
    const error = assertThrows(() => assertAiInputSize(value));
    assertEquals(error instanceof AiUsageError, true);
    assertEquals((error as AiUsageError).code, "input_too_large");
  }
});
