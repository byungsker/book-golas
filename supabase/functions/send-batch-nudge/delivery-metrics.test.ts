import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { classifyPushFailure } from "./delivery-metrics.ts";

Deno.test("classifyPushFailure marks unregistered tokens for cleanup", () => {
  assertEquals(
    classifyPushFailure(new Error("FCM API error: UNREGISTERED")),
    { failureCode: "invalid_token", invalidToken: true },
  );
  assertEquals(
    classifyPushFailure("registration-token-not-registered"),
    { failureCode: "invalid_token", invalidToken: true },
  );
});

Deno.test("classifyPushFailure does not delete tokens for payload errors", () => {
  assertEquals(
    classifyPushFailure(new Error("FCM API error: INVALID_ARGUMENT")),
    { failureCode: "provider_invalid_argument", invalidToken: false },
  );
});

Deno.test("classifyPushFailure keeps provider availability signals bounded", () => {
  assertEquals(
    classifyPushFailure(new Error("RESOURCE_EXHAUSTED")),
    { failureCode: "provider_rate_limited", invalidToken: false },
  );
  assertEquals(
    classifyPushFailure(new Error("unexpected upstream response")),
    { failureCode: "provider_error", invalidToken: false },
  );
});
