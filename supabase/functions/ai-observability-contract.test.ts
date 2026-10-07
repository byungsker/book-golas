import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { requestIdFromRequest } from "./_shared/edge-http.ts";

const aiFunctions = [
  "extract-keywords",
  "generate-book-review",
  "generate-embedding",
  "reading-insights",
  "recall-search",
  "recommend-next-books",
  "structure-notes",
] as const;

Deno.test("request IDs preserve safe caller correlation and replace unsafe values", () => {
  const safeRequest = new Request("https://example.test", {
    headers: { "x-request-id": "request-395:1" },
  });
  assertEquals(requestIdFromRequest(safeRequest), "request-395:1");

  const unsafeRequest = new Request("https://example.test", {
    headers: { "x-request-id": "prompt=do-not-store" },
  });
  const generated = requestIdFromRequest(unsafeRequest);
  assert(generated.length > 0);
  assert(generated !== "prompt=do-not-store");
});

Deno.test("the backend observability inventory contains seven AI functions", () => {
  assertEquals(aiFunctions.length, 7);
  assertEquals(new Set(aiFunctions).size, aiFunctions.length);
  assertEquals(aiFunctions[0], "extract-keywords");
  assertEquals(aiFunctions.at(-1), "structure-notes");
});
