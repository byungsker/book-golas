import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildWebErrorEvent,
  captureWebError,
} from "./error-reporting.ts";

const request = new Request("https://admin.example.test/api/admin/ai-usage", {
  headers: { "x-request-id": "web-req-421" },
});
const event = buildWebErrorEvent(request, {
  route: "/api/admin/ai-usage",
  errorCode: "ai_usage_query_failed",
  status: 500,
});

assert.deepEqual(event, {
  eventVersion: 1,
  event: "web_error",
  surface: "next_admin_api",
  severity: "error",
  sampled: true,
  sampleRate: 1,
  requestId: "web-req-421",
  route: "/api/admin/ai-usage",
  errorCode: "ai_usage_query_failed",
  status: 500,
});

const invalidRequest = new Request("https://admin.example.test", {
  headers: { "x-request-id": "unsafe request id" },
});
const sanitizedEvent = buildWebErrorEvent(invalidRequest, {
  route: "not-a-route",
  errorCode: "Unsafe code",
  status: 999,
});
assert.match(sanitizedEvent.requestId, /^[A-Za-z0-9-]+$/);
assert.equal(sanitizedEvent.route, "/unknown");
assert.equal(sanitizedEvent.errorCode, "internal_error");
assert.equal(sanitizedEvent.status, 500);

const originalError = console.error;
const captured: string[] = [];
console.error = (message?: unknown) => captured.push(String(message));
try {
  assert.equal(
    captureWebError(request, {
      route: "/api/admin/push-logs",
      errorCode: "push_summary_query_failed",
      status: 500,
    }),
    "web-req-421",
  );
} finally {
  console.error = originalError;
}
assert.equal(captured.length, 1);
assert.equal(JSON.parse(captured[0]).requestId, "web-req-421");
assert.equal(JSON.stringify(JSON.parse(captured[0])).includes("secret"), false);

const reporter = await readFile("src/lib/error-reporting.ts", "utf8");
assert.equal(reporter.includes("error.message"), false);
assert.equal(reporter.includes("error.stack"), false);
assert.equal(reporter.includes("authorization"), false);
assert.equal(reporter.includes("user_id"), false);

const aiRoute = await readFile("src/app/api/admin/ai-usage/route.ts", "utf8");
assert.match(aiRoute, /captureWebError/);
assert.match(aiRoute, /x-request-id/);
const pushRoute = await readFile("src/app/api/admin/push-logs/route.ts", "utf8");
assert.match(pushRoute, /captureWebError/);
assert.match(pushRoute, /x-request-id/);

console.log("Web error reporting fixtures passed");
