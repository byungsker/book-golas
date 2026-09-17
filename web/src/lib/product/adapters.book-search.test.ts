import { describe, expect, it, vi } from "vitest";
import { searchAladinBooks } from "./adapters";

vi.mock("server-only", () => ({}));

function makeSupabase() {
  const invoke = vi.fn().mockResolvedValue({
    data: {
      books: [{
        title: "Fixture Book",
        author: "Fixture Author",
        cover: "https://evil.example/cover.jpg",
        isbn: "9780306406157",
        publisher: "Fixture Publisher",
        genre: "essay",
        link: "https://evil.example/book",
        totalPages: 240,
        price: 18000,
      }],
    },
    error: null,
  });
  return {
    invoke,
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "20000000-0000-4000-8000-000000000002" } }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "fixture-token" } }, error: null }),
      },
      functions: { invoke },
    },
  };
}

describe("book search adapter", () => {
  it("removes untrusted provider cover and link values", async () => {
    const { supabase } = makeSupabase();
    const result = await searchAladinBooks(
      { query: "fixture", locale: "ko", pagination: { limit: 10 } },
      { factory: () => Promise.resolve(supabase as never) },
    );

    expect(result).toMatchObject({ ok: true, value: [{ imageUrl: null, aladinUrl: null }] });
  });
});
