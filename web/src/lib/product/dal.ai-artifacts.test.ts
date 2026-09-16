import { describe, expect, it, vi } from "vitest";
import { readMindMapArtifact } from "./dal/ai-artifacts";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const bookId = "30000000-0000-4000-8000-000000000003";
const generatedAt = "2026-09-15T00:00:00.000Z";

function query(data: unknown, error: unknown = null) {
  const chain = {} as Record<string, ReturnType<typeof vi.fn>>;
  for (const method of ["select", "eq", "is", "order", "limit"]) chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function client(rows: Record<string, unknown>) {
  const byTable: Record<string, unknown> = {
    note_structures: rows.note_structures ?? null,
    books: rows.books ?? null,
    reading_content_embeddings: rows.reading_content_embeddings ?? null,
    reading_progress_history: rows.reading_progress_history ?? null,
  };
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn((table: string) => query(byTable[table])),
  };
}

describe("AI artifact owner cache reader", () => {
  it("returns fresh owned mind maps and expires them after a source change", async () => {
    const structure = { bookId, generatedAt, clusters: [], connections: [] };
    const fresh = await readMindMapArtifact(bookId, {
      now: new Date("2026-09-16T00:00:00.000Z"),
      factory: () => Promise.resolve(client({
        note_structures: { structure_json: structure, updated_at: generatedAt, created_at: generatedAt },
        books: { updated_at: "2026-09-14T00:00:00.000Z" },
        reading_content_embeddings: { created_at: "2026-09-14T00:00:00.000Z" },
        reading_progress_history: { created_at: "2026-09-14T00:00:00.000Z" },
      }) as never),
    });
    expect(fresh).toMatchObject({ ok: true, value: { cacheState: "fresh", artifact: { bookId } } });

    const expired = await readMindMapArtifact(bookId, {
      factory: () => Promise.resolve(client({
        note_structures: { structure_json: structure, updated_at: generatedAt, created_at: generatedAt },
        books: { updated_at: "2026-09-16T00:00:01.000Z" },
        reading_content_embeddings: { created_at: "2026-09-14T00:00:00.000Z" },
        reading_progress_history: { created_at: "2026-09-14T00:00:00.000Z" },
      }) as never),
    });
    expect(expired).toMatchObject({ ok: true, value: { cacheState: "expired", artifact: null } });
  });
});
