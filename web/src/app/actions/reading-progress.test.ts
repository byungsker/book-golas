import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateReadingProgress } from "./reading-progress";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const bookId = "7b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52";
const userId = "1b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52";

function makeBook(currentPage: number) {
  return {
    id: bookId,
    title: "Book",
    author: "Author",
    start_date: "2026-08-01T00:00:00.000Z",
    target_date: "2026-08-31T00:00:00.000Z",
    image_url: null,
    current_page: currentPage,
    total_pages: 100,
    status: "reading",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    deleted_at: null,
  };
}

function makeQuery(result: { data: unknown; error: Error | null }) {
  const query = {
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  return query;
}

function makeSupabase(historyResult: { error: Error | null }) {
  const readQuery = makeQuery({
    data: { current_page: 1, total_pages: 100, status: "reading" },
    error: null,
  });
  const updateQuery = makeQuery({ data: makeBook(2), error: null });
  const historyQuery = {
    insert: vi.fn().mockResolvedValue({ data: null, error: historyResult.error }),
  };
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi
      .fn()
      .mockReturnValueOnce(readQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(historyQuery),
  };

  return { supabase, readQuery, updateQuery, historyQuery };
}

describe("updateReadingProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not report success when history recording fails after the page update", async () => {
    const { supabase, historyQuery } = makeSupabase({
      error: new Error("history unavailable"),
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      updateReadingProgress({ locale: "ko", bookId, currentPage: 2 }),
    ).resolves.toEqual({ ok: false, code: "history_unavailable" });

    expect(historyQuery.insert).toHaveBeenCalledWith({
      user_id: userId,
      book_id: bookId,
      page: 2,
      previous_page: 1,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/ko/home");
    expect(revalidatePath).toHaveBeenCalledWith(`/ko/books/${bookId}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/ko/reading/${bookId}`);
  });

  it("keeps user scoping on reads and updates and records successful progress", async () => {
    const { supabase, readQuery, updateQuery, historyQuery } = makeSupabase({
      error: null,
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      updateReadingProgress({ locale: "ko", bookId, currentPage: 2 }),
    ).resolves.toMatchObject({ ok: true, historyRecorded: true });

    expect(readQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(updateQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(historyQuery.insert).toHaveBeenCalledTimes(1);
  });

  it("stops before database access when the session is missing", async () => {
    const from = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from,
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      updateReadingProgress({ locale: "ko", bookId, currentPage: 2 }),
    ).resolves.toEqual({ ok: false, code: "unauthenticated" });
    expect(from).not.toHaveBeenCalled();
  });
});
