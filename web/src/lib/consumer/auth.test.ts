import { describe, expect, it, vi } from "vitest";
import negativeFixtures from "../../../scripts/fixtures/auth-email-negative.json";
import {
  getPasswordMinLength,
  getPasswordValidationError,
  getEmailValidationError,
  getNicknameValidationError,
  getSignInErrorKey,
  isAccountExistenceError,
  readSavedEmail,
  savedEmailStorageKey,
  signInWithPassword,
  signOutUser,
  writeSavedEmail,
} from "./auth";

describe("consumer authentication contracts", () => {
  it("does not constrain sign-in passwords while preserving account setup rules", () => {
    expect(getPasswordMinLength("sign-in", false)).toBeUndefined();
    expect(getPasswordMinLength("sign-up", false)).toBe(6);
    expect(getPasswordMinLength("reset-password", true)).toBe(6);
    expect(getPasswordMinLength("reset-password", false)).toBeUndefined();
  });

  it("validates the native-required signup nickname after trimming", () => {
    expect(getNicknameValidationError("  ")).toBe("required");
    expect(getNicknameValidationError("Reader")).toBeNull();
  });

  it("validates required and malformed email values locally", () => {
    expect(getEmailValidationError(" ")).toBe("required");
    expect(getEmailValidationError("reader.example.com")).toBe("invalid");
    expect(getEmailValidationError(" reader@example.com ")).toBeNull();
  });

  it("maps sign-in failures without distinguishing a missing account", () => {
    expect(getSignInErrorKey("Invalid login credentials")).toBe("errors.invalidCredentials");
    expect(getSignInErrorKey("Email not confirmed")).toBe("errors.emailUnconfirmed");
    expect(getSignInErrorKey("User not found")).toBe("errors.generic");
    for (const message of negativeFixtures.accountExistenceMessages) {
      expect(isAccountExistenceError(message)).toBe(true);
    }
  });

  it("stores only the opted-in normalized email and removes it on opt-out", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    writeSavedEmail(storage, " reader@example.com ", true);
    expect(values.get(savedEmailStorageKey)).toBe("reader@example.com");
    expect(readSavedEmail(storage)).toBe("reader@example.com");
    expect([...values.values()]).not.toContain("password123");

    writeSavedEmail(storage, "reader@example.com", false);
    expect(readSavedEmail(storage)).toBe("");
  });

  it("preserves submit-time password validation for migrated BLDS fields", () => {
    expect(getPasswordValidationError("sign-in", false, "short", "")).toBeNull();
    expect(getPasswordValidationError("sign-up", false, "short", "")).toBe("short");
    expect(getPasswordValidationError("reset-password", true, "long-enough", "short")).toBe("short");
    expect(getPasswordValidationError("reset-password", true, "long-enough", "different")).toBe("mismatch");
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
