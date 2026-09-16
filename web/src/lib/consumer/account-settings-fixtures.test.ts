import { beforeEach, describe, expect, it } from "vitest";
import {
  getAccountSettingsFixture,
  resetAccountSettingsFixtures,
  updateAccountSettingsFixture,
  uploadAccountSettingsAvatarFixture,
} from "./account-settings-fixtures";

describe("account settings fixtures", () => {
  beforeEach(() => resetAccountSettingsFixtures());

  it("round-trips the current user's nickname and avatar", () => {
    const updated = updateAccountSettingsFixture("account-settings-happy", "Updated Reader");
    expect(updated).toMatchObject({ ok: true, value: { profile: { nickname: "Updated Reader" } } });
    const avatar = uploadAccountSettingsAvatarFixture("account-settings-happy", "image/png");
    expect(avatar).toMatchObject({ ok: true, value: { path: "00000000-0000-4000-8000-000000000001/avatar.png" } });
    expect(getAccountSettingsFixture("account-settings-happy")).toMatchObject({ ok: true, value: { profile: { avatarUrl: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20fill%3D%22%236473ff%22%2F%3E%3C%2Fsvg%3E" } } });
  });

  it("keeps negative ownership and upload cases explicit", () => {
    expect(updateAccountSettingsFixture("account-settings-foreign", "Other user")).toMatchObject({ ok: false, error: { code: "validation_error" } });
    expect(uploadAccountSettingsAvatarFixture("account-settings-avatar-failure", "image/png")).toMatchObject({ ok: false, error: { code: "provider_error" } });
    expect(getAccountSettingsFixture("account-settings-unauthorized")).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(getAccountSettingsFixture("account-settings-empty")).toMatchObject({ ok: true, value: { state: "empty", profile: null } });
  });
});
