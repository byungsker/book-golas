import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts";
import { stub } from "https://deno.land/std@0.168.0/testing/mock.ts";
import { errorResponse, jsonResponse, withEdgeFunction } from "./edge-http.ts";

describe("shared Edge Function HTTP wrapper", () => {
  it("preserves the success body and emits request metadata", async () => {
    const log = stub(console, "log");
    try {
      const handler = withEdgeFunction(
        "test-function",
        async (_req, context) => jsonResponse({ success: true }, 200, context),
      );
      const response = await handler(
        new Request("https://example.test", {
          method: "POST",
          headers: { "x-request-id": "req-123" },
        }),
      );

      assertEquals(response.status, 200);
      assertEquals(response.headers.get("x-request-id"), "req-123");
      assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
      assertEquals(await response.json(), { success: true });
      const event = JSON.parse(log.calls[0].args[0] as string);
      assertEquals(event.eventVersion, 1);
      assertEquals(event.functionName, "test-function");
      assertEquals(event.surface, "supabase_edge_function");
      assertEquals(event.severity, "info");
      assertEquals(event.sampled, true);
      assertEquals(event.requestId, "req-123");
      assertEquals(event.status, 200);
      assertEquals(event.errorCode, "ok");
      assertEquals(typeof event.latencyMs, "number");
    } finally {
      log.restore();
    }
  });

  it("replaces unsafe request IDs and handles preflight", async () => {
    const log = stub(console, "log");
    try {
      const handler = withEdgeFunction(
        "test-function",
        async (_req, context) => jsonResponse({ success: true }, 200, context),
      );
      const response = await handler(
        new Request("https://example.test", {
          method: "OPTIONS",
          headers: { "x-request-id": "unsafe request id" },
        }),
      );

      assertEquals(response.status, 204);
      const requestId = response.headers.get("x-request-id");
      assertEquals(typeof requestId, "string");
      assertStringIncludes(requestId ?? "", "-");
      const event = JSON.parse(log.calls[0].args[0] as string);
      assertEquals(event.status, 204);
      assertEquals(event.errorCode, "ok");
    } finally {
      log.restore();
    }
  });

  it("masks thrown errors and emits a bounded error code", async () => {
    const log = stub(console, "log");
    try {
      const handler = withEdgeFunction("test-function", async () => {
        throw new Error("provider response secret");
      });
      const response = await handler(
        new Request("https://example.test", { method: "POST" }),
      );

      assertEquals(response.status, 500);
      assertEquals(await response.json(), { error: "Internal server error" });
      const event = JSON.parse(log.calls[0].args[0] as string);
      assertEquals(event.errorCode, "internal_error");
      assertEquals(event.severity, "error");
      assertEquals(
        JSON.stringify(event).includes("provider response secret"),
        false,
      );
    } finally {
      log.restore();
    }
  });

  it("keeps public error shape while classifying the response", async () => {
    const log = stub(console, "log");
    try {
      const handler = withEdgeFunction(
        "test-function",
        async (_req, context) =>
          errorResponse(context, "auth_unauthorized", 401, "Unauthorized"),
      );
      const response = await handler(
        new Request("https://example.test", { method: "POST" }),
      );

      assertEquals(response.status, 401);
      assertEquals(await response.json(), { error: "Unauthorized" });
      const event = JSON.parse(log.calls[0].args[0] as string);
      assertEquals(event.errorCode, "auth_unauthorized");
    } finally {
      log.restore();
    }
  });
});
