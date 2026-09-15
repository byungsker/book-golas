import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  getConsent,
  invokeProductRpc,
  listGlobalRecallHistory,
  listRecallHistory,
} from "./adapters";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const sourceId = "50000000-0000-4000-8000-000000000005";
const bookId = "30000000-0000-4000-8000-000000000003";
const generatedAt = "2026-09-14T00:00:00.000Z";

function makeQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return query;
}

function makeSupabase(query: ReturnType<typeof makeQuery>) {
  const rpc = vi.fn().mockResolvedValue({ data: { allowed: true }, error: null });
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn().mockReturnValue(query),
    rpc,
  };
  return { supabase, rpc };
}

function factoryFor(supabase: unknown) {
  return () => Promise.resolve(supabase as never);
}

describe("typed Supabase table and RPC adapters", () => {
  it("reads recall history with the verified owner filter and converts row names", async () => {
    const query = makeQuery([{
      id: "60000000-0000-4000-8000-000000000006",
      query: "What did I save?",
      answer: "A note",
      sources: [{
        type: "note",
        content: "A note",
        pageNumber: 2,
        sourceId,
        createdAt: generatedAt,
        bookId,
        bookTitle: "Typed book",
      }],
      created_at: generatedAt,
    }]);
    const { supabase } = makeSupabase(query);
    const result = await listRecallHistory({ limit: 10, factory: factoryFor(supabase) });
    expect(result).toMatchObject({ ok: true, value: [{ createdAt: generatedAt, query: "What did I save?" }] });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("returns a typed consent record and does not treat absence as an error", async () => {
    const query = makeQuery({ kind: "ai", status: "granted", version: "2026-09" });
    const { supabase } = makeSupabase(query);
    const result = await getConsent("ai", { factory: factoryFor(supabase) });
    expect(result).toEqual({ ok: true, value: { kind: "ai", status: "granted", version: "2026-09" } });

    const absent = makeQuery(null);
    const absentSupabase = makeSupabase(absent);
    expect(await getConsent("ai", { factory: factoryFor(absentSupabase.supabase) })).toEqual({ ok: true, value: null });
  });

  it("limits global Recall history to owner rows with no book", async () => {
    const query = makeQuery([{
      id: "60000000-0000-4000-8000-000000000006",
      book_id: null,
      query: "What did I save globally?",
      answer: "A global answer",
      sources: [],
      created_at: generatedAt,
    }]);
    const { supabase } = makeSupabase(query);
    const result = await listGlobalRecallHistory({ limit: 10, factory: factoryFor(supabase) });
    expect(result).toMatchObject({ ok: true, value: [{ query: "What did I save globally?" }] });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.is).toHaveBeenCalledWith("book_id", null);
  });

  it("validates RPC output and rejects caller-selected ownership parameters", async () => {
    const query = makeQuery([]);
    const { supabase, rpc } = makeSupabase(query);
    const result = await invokeProductRpc(
      "consume_book_budget",
      { amount: 1 },
      z.object({ allowed: z.literal(true) }),
      { factory: factoryFor(supabase) },
    );
    expect(result).toEqual({ ok: true, value: { allowed: true } });
    expect(rpc).toHaveBeenCalledWith("consume_book_budget", { amount: 1 });

    const rejected = await invokeProductRpc(
      "consume_book_budget",
      { user_id: userId },
      z.object({ allowed: z.literal(true) }),
      { factory: factoryFor(supabase) },
    );
    expect(rejected).toMatchObject({ ok: false, error: { code: "validation_error", status: 400 } });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
