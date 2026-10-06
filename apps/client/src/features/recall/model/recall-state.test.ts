import { describe, expect, it } from "vitest";
import { RecallUiStateSchema } from "./recall-state";

describe("recall UI state", () => {
  it("enumerates distinct consumer states", () => {
    expect(RecallUiStateSchema.options).toEqual(expect.arrayContaining(["idle", "loading", "empty", "unauthorized", "consent_required", "quota_exceeded", "provider_error", "offline", "error"]));
  });
});
