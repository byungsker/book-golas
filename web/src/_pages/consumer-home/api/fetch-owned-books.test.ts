import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/shared/api/supabase/index.server";
import { fetchOwnedBooks } from "./fetch-owned-books";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/shared/api/supabase/index.server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe("fetchOwnedBooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never);
  });

  it("reports an unavailable collection fixture before the synthetic user branch", async () => {
    const previousMode = process.env.BOOKGOLAS_ROUTE_TEST_MODE;
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "unavailable" }),
    } as never);

    try {
      await expect(fetchOwnedBooks()).resolves.toEqual({ books: [], code: "unavailable" });
    } finally {
      if (previousMode === undefined) delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
      else process.env.BOOKGOLAS_ROUTE_TEST_MODE = previousMode;
      if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
  });
});
