import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { createHandler } from "./handler.ts";

function request(body: unknown, contentLength?: number): Request {
  const payload = JSON.stringify(body);
  return new Request("http://localhost/vision-ocr", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
      "Content-Length": String(contentLength ?? payload.length),
    },
    body: payload,
  });
}

Deno.test("vision proxy rejects unauthenticated requests", async () => {
  const handler = createHandler({
    apiKey: "test-key",
    authenticate: () => Promise.resolve(null),
    hasConsent: () => Promise.resolve(false),
    fetchUpstream: () => Promise.reject(new Error("must not run")),
  });

  const response = await handler(request({ imageBase64: "dGVzdA==" }));

  assertEquals(response.status, 401);
});

Deno.test("vision proxy rejects missing consent without an upstream call", async () => {
  let upstreamCalls = 0;
  const handler = createHandler({
    apiKey: "test-key",
    authenticate: () => Promise.resolve("user-a"),
    hasConsent: () => Promise.resolve(false),
    fetchUpstream: () => {
      upstreamCalls += 1;
      return Promise.resolve(new Response());
    },
  });

  const response = await handler(request({ imageBase64: "dGVzdA==" }));

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "third_party_ai_consent_required",
  });
  assertEquals(upstreamCalls, 0);
});

Deno.test("vision proxy rejects oversized requests before upstream transfer", async () => {
  const handler = createHandler({
    apiKey: "test-key",
    authenticate: () => Promise.resolve("user-a"),
    hasConsent: () => Promise.resolve(true),
    fetchUpstream: () => Promise.reject(new Error("must not run")),
  });

  const response = await handler(
    request({ imageBase64: "dGVzdA==" }, 11_300_001),
  );

  assertEquals(response.status, 400);
});

Deno.test("vision proxy sends valid content without exposing response secrets", async () => {
  let requestedUrl = "";
  let requestedBody = "";
  const handler = createHandler({
    apiKey: "server-key",
    authenticate: () => Promise.resolve("user-a"),
    hasConsent: () => Promise.resolve(true),
    fetchUpstream: (input, init) => {
      requestedUrl = input.toString();
      requestedBody = init != null && "body" in init
        ? init.body?.toString() ?? ""
        : "";
      return Promise.resolve(
        new Response(
          JSON.stringify({
            responses: [{ fullTextAnnotation: { text: "recognized" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    },
  });

  const response = await handler(request({ imageBase64: "dGVzdA==" }));
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body, { text: "recognized" });
  assertStringIncludes(requestedUrl, "key=server-key");
  assertStringIncludes(requestedBody, "DOCUMENT_TEXT_DETECTION");
});
