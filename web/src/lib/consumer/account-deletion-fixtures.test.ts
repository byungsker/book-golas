import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteAccountFixture,
  resetAccountDeletionFixtures,
} from "./account-deletion-fixtures";

describe("account deletion fixtures", () => {
  beforeEach(() => resetAccountDeletionFixtures());

  it("returns a completed result and makes repeated invocation idempotent", () => {
    expect(deleteAccountFixture("account-deletion-success")).toMatchObject({
      ok: true,
      value: { status: "completed" },
    });
    expect(deleteAccountFixture("account-deletion-success")).toMatchObject({
      ok: true,
      value: { status: "already_deleted" },
    });
  });

  it("keeps failure fixtures typed and side-effect free", () => {
    expect(deleteAccountFixture("account-deletion-unauthorized")).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(deleteAccountFixture("account-deletion-offline")).toMatchObject({ ok: false, error: { code: "offline" } });
    expect(deleteAccountFixture("account-deletion-quota")).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
  });
});
