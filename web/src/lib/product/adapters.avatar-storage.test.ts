import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertOwnedAvatarPath,
  getOwnedAvatarUrl,
  ownedAvatarPath,
  uploadOwnedAvatar,
} from "./adapters/avatar-storage";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const foreignUserId = "10000000-0000-4000-8000-000000000001";

function makeSupabase() {
  const upload = vi.fn().mockResolvedValue({
    data: { path: `${userId}/avatar.png`, fullPath: `avatars/${userId}/avatar.png` },
    error: null,
  });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.example.invalid/avatar" }, error: null });
  const storageFile = { upload, createSignedUrl };
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    storage: { from: vi.fn().mockReturnValue(storageFile) },
  };
  return { supabase, upload, createSignedUrl };
}

function factoryFor(supabase: unknown) {
  return () => Promise.resolve(supabase as never);
}

describe("private avatar storage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives an owner-scoped path and signs only that path", async () => {
    const { supabase, upload, createSignedUrl } = makeSupabase();
    expect(ownedAvatarPath(userId, "image/png")).toEqual({ ok: true, value: { bucket: "account-avatars", path: `${userId}/avatar.png` } });
    expect(assertOwnedAvatarPath(userId, `${foreignUserId}/avatar.png`)).toMatchObject({ ok: false, error: { code: "forbidden" } });
    const uploaded = await uploadOwnedAvatar({ body: new Blob(["image"]), contentType: "image/png" }, factoryFor(supabase));
    expect(uploaded).toMatchObject({ ok: true, value: { path: `${userId}/avatar.png` } });
    expect(upload).toHaveBeenCalledWith(`${userId}/avatar.png`, expect.any(Blob), expect.objectContaining({ upsert: true, contentType: "image/png" }));
    const signed = await getOwnedAvatarUrl(`${userId}/avatar.png`, factoryFor(supabase));
    expect(signed).toMatchObject({ ok: true, value: { signedUrl: "https://storage.example.invalid/avatar" } });
    expect(createSignedUrl).toHaveBeenCalledWith(`${userId}/avatar.png`, 900);
  });
});
