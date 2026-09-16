import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readOwnedAccountSettings,
  updateOwnedAccountProfile,
  uploadOwnedAccountAvatar,
} from "./dal/account-settings";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";

function profileRow(avatarUrl: string | null = null) {
  return {
    id: userId,
    email: "reader@example.com",
    nickname: "Reader",
    name: "Bookgolas Reader",
    avatar_url: avatarUrl,
    created_at: "2026-09-01T00:00:00.000Z",
    last_sign_in_at: "2026-09-16T00:00:00.000Z",
  };
}

function makeSupabase(row = profileRow()) {
  const query = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  const upload = vi.fn().mockResolvedValue({ data: { path: `${userId}/avatar.png`, fullPath: `avatars/${userId}/avatar.png` }, error: null });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.example.invalid/avatar" }, error: null });
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: vi.fn().mockReturnValue(query),
    storage: { from: vi.fn().mockReturnValue({ upload, createSignedUrl }) },
  };
  return { supabase, query, upload, createSignedUrl };
}

function factoryFor(supabase: unknown) {
  return () => Promise.resolve(supabase as never);
}

describe("account settings DAL", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads and updates only the verified user profile", async () => {
    const { supabase, query } = makeSupabase();
    const read = await readOwnedAccountSettings(factoryFor(supabase));
    expect(read).toMatchObject({ ok: true, value: { profile: { nickname: "Reader" } } });
    expect(query.eq).toHaveBeenCalledWith("id", userId);
    query.maybeSingle.mockResolvedValueOnce({ data: { ...profileRow(), nickname: "Updated" }, error: null });
    const updated = await updateOwnedAccountProfile({ nickname: "Updated" }, factoryFor(supabase));
    expect(updated).toMatchObject({ ok: true, value: { profile: { nickname: "Updated" } } });
    expect(query.update).toHaveBeenCalledWith({ nickname: "Updated" });
  });

  it("does not update the profile when private avatar upload fails", async () => {
    const { supabase, query, upload } = makeSupabase();
    upload.mockResolvedValueOnce({ data: null, error: { status: 503, message: "offline" } });
    const result = await uploadOwnedAccountAvatar({ body: new Blob(["image"]), contentType: "image/png" }, factoryFor(supabase));
    expect(result).toMatchObject({ ok: false, error: { code: "provider_error" } });
    expect(query.update).not.toHaveBeenCalled();
  });

  it("writes a private storage reference only after upload succeeds", async () => {
    const { supabase, query, upload, createSignedUrl } = makeSupabase();
    query.maybeSingle.mockResolvedValueOnce({ data: profileRow(`storage://account-avatars/${userId}/avatar.png`), error: null });
    const result = await uploadOwnedAccountAvatar({ body: new Blob(["image"]), contentType: "image/png" }, factoryFor(supabase));
    expect(result).toMatchObject({ ok: true, value: { avatarPath: `${userId}/avatar.png`, profile: { avatarUrl: "https://storage.example.invalid/avatar" } } });
    expect(upload).toHaveBeenCalled();
    expect(query.update).toHaveBeenCalledWith({ avatar_url: `storage://account-avatars/${userId}/avatar.png` });
    expect(createSignedUrl).toHaveBeenCalled();
  });
});
