import { SupabaseDataSource } from "../src/supabase-data-source.ts";

function assert(
  condition: unknown,
  message = "assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("Supabase data source keeps every query user-scoped", async () => {
  const requests: Array<{ url: string; authorization: string }> = [];
  const source = new SupabaseDataSource(
    "https://supabase.test",
    "anon-key",
    (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(
          (init as { headers?: HeadersInit } | undefined)?.headers,
        ).get("Authorization") ?? "",
      });
      return Promise.resolve(
        new Response(
          JSON.stringify([{
            id: "book-a",
            title: "Book A",
            author: "Author A",
            status: "reading",
            current_page: 3,
            total_pages: 10,
            updated_at: "2026-08-22T00:00:00.000Z",
          }]),
          { status: 200, headers: { "Content-Range": "0-0/1" } },
        ),
      );
    },
  );

  const result = await source.listLibrary("user-a", "user-token", 1, 20);
  assert(result.items.length === 1);
  assert(requests.length === 1);
  assert(requests[0].authorization === "Bearer user-token");
  assert(requests[0].url.includes("user_id=eq.user-a"));
  assert(!requests[0].url.includes("user-b"));
});
