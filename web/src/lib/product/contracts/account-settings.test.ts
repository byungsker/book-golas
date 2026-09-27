import { describe, expect, it } from "vitest";
import {
  AccountAvatarResponseSchema,
  AccountProfileSchema,
  AccountProfileUpdateRequestSchema,
  AccountSettingsResponseSchema,
} from "./account-settings";

const userId = "20000000-0000-4000-8000-000000000002";
const profile = {
  id: userId,
  email: "reader@example.com",
  nickname: "Reader",
  name: "Bookgolas Reader",
  avatarUrl: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  lastSignInAt: "2026-09-16T00:00:00.000Z",
};

describe("account settings contracts", () => {
  it("accepts a localized profile and disabled subscription response", () => {
    expect(AccountSettingsResponseSchema.parse({
      state: "ready",
      profile,
      subscription: { enabled: false, status: "free" },
    }).profile?.id).toBe(userId);
  });

  it("rejects caller identity fields and malformed avatar responses", () => {
    expect(AccountProfileUpdateRequestSchema.safeParse({ nickname: "Reader", user_id: userId }).success).toBe(false);
    expect(AccountProfileSchema.safeParse({ ...profile, unexpected: true }).success).toBe(false);
    expect(AccountAvatarResponseSchema.safeParse({ kind: "avatar_updated", path: "x", avatarUrl: "not-url" }).success).toBe(false);
  });
});
