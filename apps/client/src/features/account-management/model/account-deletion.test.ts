import { describe, expect, it } from "vitest";
import {
  clearAccountDeletionClientState,
  isAccountDeletionConfirmationValid,
} from "./account-deletion";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

describe("account deletion client boundary", () => {
  it("accepts only the localized destructive confirmation token", () => {
    expect(isAccountDeletionConfirmationValid("DELETE", "DELETE")).toBe(true);
    expect(isAccountDeletionConfirmationValid(" 삭제 ", "삭제")).toBe(true);
    expect(isAccountDeletionConfirmationValid("delete", "DELETE")).toBe(false);
    expect(isAccountDeletionConfirmationValid("YES", "YES")).toBe(false);
  });

  it("clears Bookgolas and Supabase browser state while preserving unrelated storage", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem("bookgolas.reading-timer.v1", "timer");
    local.setItem("bookgolas.theme", "dark");
    local.setItem("sb-local-auth-token", "session");
    local.setItem("unrelated.preference", "keep");
    session.setItem("bookgolas.route", "private");

    clearAccountDeletionClientState(local, session);

    expect(local.getItem("bookgolas.reading-timer.v1")).toBeNull();
    expect(local.getItem("bookgolas.theme")).toBeNull();
    expect(local.getItem("sb-local-auth-token")).toBeNull();
    expect(local.getItem("unrelated.preference")).toBe("keep");
    expect(session.length).toBe(0);
  });
});
