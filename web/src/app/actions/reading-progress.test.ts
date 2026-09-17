import { beforeEach, describe, expect, it, vi } from "vitest";
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
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  return query;
}

function makeSupabase(
  progressResult: {
    data: unknown;
    error: { code?: string; message?: string } | null;
  } = {
    data: [
      {
        book_id: bookId,
        previous_page: 1,
        current_page: 2,
        status: "reading",
        updated_at: "2026-08-01T00:00:00.000Z",
        history_id: "2b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
        history_recorded: true,
      },
    ],
    error: null,
  },
) {
  const readQuery = makeQuery({ data: makeBook(2), error: null });
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue(progressResult),
    from: vi.fn().mockReturnValue(readQuery),
  };

  return { supabase, readQuery };
}

describe("updateReadingProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the atomic RPC and reads the updated owned book", async () => {
    const { supabase, readQuery } = makeSupabase();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      updateReadingProgress({
        locale: "ko",
        bookId,
        currentPage: 2,
        expectedCurrentPage: 1,
        idempotencyKey: "2b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
      }),
    ).resolves.toMatchObject({ ok: true, historyRecorded: true });

    expect(supabase.rpc).toHaveBeenCalledWith("update_reading_progress", {
      p_book_id: bookId,
      p_current_page: 2,
      p_expected_current_page: 1,
      p_idempotency_key: "2b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
      p_reading_time: 0,
    });
    expect(readQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("maps a stale RPC response to a conflict without direct writes", async () => {
    const { supabase } = makeSupabase({
      data: null,
      error: { code: "P0001", message: "progress_conflict" },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(
      updateReadingProgress({
        locale: "ko",
        bookId,
        currentPage: 2,
        expectedCurrentPage: 1,
        idempotencyKey: "2b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
      }),
    ).resolves.toEqual({ ok: false, code: "conflict" });
    expect(supabase.from).not.toHaveBeenCalled();
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
      updateReadingProgress({
        locale: "ko",
        bookId,
        currentPage: 2,
        expectedCurrentPage: 1,
        idempotencyKey: "2b7f8d24-4f48-4bd5-b1ca-bb1d765b1d52",
      }),
    ).resolves.toEqual({ ok: false, code: "unauthenticated" });
    expect(from).not.toHaveBeenCalled();
  });
});
