import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { fetchOwnedBook, fetchOwnedBooks } from "./queries";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

function makeSupabase(user: { id: string } | null) {
  const from = vi.fn();
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from,
  };

  return { supabase, from };
}

describe("fetchOwnedBook malformed identifiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never);
  });

  it("preserves authenticated header state without querying books", async () => {
    const { supabase, from } = makeSupabase({ id: "user-1" });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(fetchOwnedBook("not-a-book-id")).resolves.toEqual({
      book: null,
      code: "not_found",
      authenticated: true,
    });
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });

  it("keeps anonymous malformed requests unauthenticated without querying books", async () => {
    const { supabase, from } = makeSupabase(null);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(fetchOwnedBook("not-a-book-id")).resolves.toEqual({
      book: null,
      code: "not_found",
      authenticated: false,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("reports an unavailable session boundary without querying books", async () => {
    vi.mocked(createServerSupabaseClient).mockRejectedValue(new Error("network"));

    await expect(fetchOwnedBook("not-a-book-id")).resolves.toEqual({
      book: null,
      code: "unavailable",
      authenticated: false,
    });
  });

  it("maps an auth provider failure to an unavailable session boundary", async () => {
    const { supabase, from } = makeSupabase(null);
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("auth unavailable"),
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      fetchOwnedBook("00000000-0000-4000-8000-000000002001"),
    ).resolves.toEqual({
      book: null,
      code: "unavailable",
      authenticated: false,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns a typed owner-scoped miss without exposing a foreign book", async () => {
    const { supabase, from } = makeSupabase({ id: "user-1" });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    from.mockReturnValue(query);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      fetchOwnedBook("00000000-0000-4000-8000-000000002001"),
    ).resolves.toEqual({
      book: null,
      code: "not_found",
      authenticated: true,
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("reports an unavailable collection fixture before the synthetic user branch", async () => {
    const previousMode = process.env.BOOKGOLAS_ROUTE_TEST_MODE;
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "unavailable" }),
    } as never);

    await expect(fetchOwnedBooks()).resolves.toEqual({ books: [], code: "unavailable" });

    if (previousMode === undefined) delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
    else process.env.BOOKGOLAS_ROUTE_TEST_MODE = previousMode;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  });
});
