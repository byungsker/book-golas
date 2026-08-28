import { describe, expect, it, vi } from "vitest";
import {
  getPasswordMinLength,
  signInWithPassword,
  signOutUser,
} from "./auth";

describe("consumer authentication contracts", () => {
  it("does not constrain sign-in passwords while preserving account setup rules", () => {
    expect(getPasswordMinLength("sign-in", false)).toBeUndefined();
    expect(getPasswordMinLength("sign-up", false)).toBe(8);
    expect(getPasswordMinLength("reset-password", true)).toBe(8);
    expect(getPasswordMinLength("reset-password", false)).toBeUndefined();
  });

  it("passes short existing-account credentials to the auth provider", async () => {
    const provider = vi.fn().mockResolvedValue({ error: null });

    await signInWithPassword(
      { signInWithPassword: provider },
      "reader@example.com",
      "short7",
    );

    expect(provider).toHaveBeenCalledWith({
      email: "reader@example.com",
      password: "short7",
    });
  });

  it("reports sign-out provider failures without treating them as success", async () => {
    const rejected = vi.fn().mockResolvedValue({ error: new Error("denied") });
    const thrown = vi.fn().mockRejectedValue(new Error("network"));
    const succeeded = vi.fn().mockResolvedValue({ error: null });

    await expect(signOutUser({ signOut: rejected })).resolves.toBe(false);
    await expect(signOutUser({ signOut: thrown })).resolves.toBe(false);
    await expect(signOutUser({ signOut: succeeded })).resolves.toBe(true);
  });
});
