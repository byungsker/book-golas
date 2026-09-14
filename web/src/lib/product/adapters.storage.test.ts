import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertOwnedBookImagePath,
  getBookImageUrl,
  ownedBookImagePath,
  uploadBookImage,
} from "./adapters";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const bookId = "30000000-0000-4000-8000-000000000003";
const foreignUserId = "10000000-0000-4000-8000-000000000001";

function makeSupabase() {
  const upload = vi.fn().mockResolvedValue({
    data: {
      id: "object-id",
      path: `${userId}/${bookId}/page.jpg`,
      fullPath: `book-images/${userId}/${bookId}/page.jpg`,
    },
    error: null,
  });
  const createSignedUrl = vi.fn()
    .mockResolvedValueOnce({ data: { signedUrl: "https://storage.example.invalid/signed-1" }, error: null })
    .mockResolvedValueOnce({ data: { signedUrl: "https://storage.example.invalid/signed-2" }, error: null });
  const storageFile = { upload, createSignedUrl };
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "token" } }, error: null }),
    },
    storage: { from: vi.fn().mockReturnValue(storageFile) },
  };
  return { supabase, upload, createSignedUrl, storageFile };
}

function factoryFor(supabase: unknown) {
  return () => Promise.resolve(supabase as never);
}

describe("private book image adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives an owner-scoped private path and uploads through book-images", async () => {
    const { supabase, upload } = makeSupabase();
    const path = ownedBookImagePath(userId, bookId, "page.jpg");
    expect(path).toEqual({
      ok: true,
      value: { bucket: "book-images", path: `${userId}/${bookId}/page.jpg` },
    });

    const result = await uploadBookImage(
      { bookId, fileName: "page.jpg", body: new Blob(["image"]), contentType: "image/jpeg" },
      factoryFor(supabase),
    );
    expect(result).toMatchObject({
      ok: true,
      value: { bucket: "book-images", path: `${userId}/${bookId}/page.jpg` },
    });
    expect(upload).toHaveBeenCalledWith(
      `${userId}/${bookId}/page.jpg`,
      expect.any(Blob),
      expect.objectContaining({ contentType: "image/jpeg", upsert: false }),
    );
  });

  it("rejects foreign and traversal paths before storage access", () => {
    const foreign = assertOwnedBookImagePath(
      userId,
      bookId,
      `${foreignUserId}/${bookId}/page.jpg`,
    );
    expect(foreign).toMatchObject({ ok: false, error: { code: "forbidden", status: 403 } });

    const traversal = assertOwnedBookImagePath(
      userId,
      bookId,
      `${userId}/${bookId}/../page.jpg`,
    );
    expect(traversal).toMatchObject({ ok: false, error: { code: "validation_error", status: 400 } });
    expect(ownedBookImagePath(userId, bookId, "../page.jpg")).toMatchObject({
      ok: false,
      error: { code: "validation_error" },
    });
  });

  it("expired-signed-url renews after the cached URL expires", async () => {
    const { supabase, createSignedUrl } = makeSupabase();
    const cache = new Map();
    let now = Date.parse("2026-09-14T00:00:00.000Z");
    const options = { cache, now: () => now, expiresIn: 60 };

    const first = await getBookImageUrl(
      bookId,
      `${userId}/${bookId}/page.jpg`,
      options,
      factoryFor(supabase),
    );
    expect(first).toMatchObject({ ok: true, value: { signedUrl: "https://storage.example.invalid/signed-1" } });

    now += 10_000;
    const reused = await getBookImageUrl(
      bookId,
      `${userId}/${bookId}/page.jpg`,
      options,
      factoryFor(supabase),
    );
    expect(reused).toMatchObject({ ok: true, value: { signedUrl: "https://storage.example.invalid/signed-1" } });
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    now += 60_000;
    const refreshed = await getBookImageUrl(
      bookId,
      `${userId}/${bookId}/page.jpg`,
      options,
      factoryFor(supabase),
    );
    expect(refreshed).toMatchObject({ ok: true, value: { signedUrl: "https://storage.example.invalid/signed-2" } });
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it("preserves a storage authorization error", async () => {
    const { supabase } = makeSupabase();
    const storageFile = {
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: { status: 403, message: "Object is not accessible" },
      }),
    };
    supabase.storage.from.mockReturnValue(storageFile);
    const result = await getBookImageUrl(
      bookId,
      `${userId}/${bookId}/page.jpg`,
      {},
      factoryFor(supabase),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "forbidden", status: 403 } });
  });
});
