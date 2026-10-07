import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { createHandler } from "./handler.ts";

function request(body: unknown): Request {
  return new Request("http://localhost/aladin-books", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.test("aladin proxy rejects unauthenticated requests", async () => {
  const handler = createHandler({
    apiKey: "test-key",
    authenticate: () => Promise.resolve(false),
    fetchUpstream: () => Promise.reject(new Error("must not run")),
  });

  const response = await handler(request({ action: "search", query: "book" }));

  assertEquals(response.status, 401);
});

Deno.test("aladin proxy validates search input before upstream request", async () => {
  const handler = createHandler({
    apiKey: "test-key",
    authenticate: () => Promise.resolve(true),
    fetchUpstream: () => Promise.reject(new Error("must not run")),
  });

  const response = await handler(request({ action: "search", query: "" }));

  assertEquals(response.status, 400);
});

Deno.test("aladin proxy limits result count and keeps the key server-side", async () => {
  let requestedUrl = "";
  const handler = createHandler({
    apiKey: "server-key",
    authenticate: () => Promise.resolve(true),
    fetchUpstream: (input) => {
      requestedUrl = input.toString();
      return Promise.resolve(
        new Response(JSON.stringify({ item: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    },
  });

  const response = await handler(
    request({ action: "search", query: "habits", maxResults: 999 }),
  );

  assertEquals(response.status, 200);
  assertStringIncludes(requestedUrl, "MaxResults=10");
  assertStringIncludes(requestedUrl, "ttbkey=server-key");
});
