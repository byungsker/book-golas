import { describe, expect, it } from "vitest";
import {
  completeOnboardingState,
  onboardingStorageKeys,
  readOnboardingState,
  resetOnboardingState,
} from "./onboarding";

function createStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("onboarding local persistence", () => {
  it("persists completion only with an age-policy choice", () => {
    const storage = createStorage();

    expect(completeOnboardingState(storage, "age14OrOlder")).toBe(true);
    expect(readOnboardingState(storage)).toEqual({
      status: "complete",
      agePolicy: "age14OrOlder",
      recovered: false,
    });
  });

  it("recovers corrupt local values as reset first-run state", () => {
    const storage = createStorage({
      [onboardingStorageKeys.completed]: "{broken",
      [onboardingStorageKeys.agePolicy]: "unknown-age",
    });

    expect(readOnboardingState(storage)).toEqual({
      status: "incomplete",
      agePolicy: null,
      recovered: true,
    });
    expect(storage.length).toBe(0);
  });

  it("exposes a deterministic reset for browser fixtures", () => {
    const storage = createStorage({
      [onboardingStorageKeys.completed]: "true",
      [onboardingStorageKeys.agePolicy]: "under14",
      unrelated: "preserved",
    });

    resetOnboardingState(storage);

    expect(storage.getItem(onboardingStorageKeys.completed)).toBeNull();
    expect(storage.getItem(onboardingStorageKeys.agePolicy)).toBeNull();
    expect(storage.getItem("unrelated")).toBe("preserved");
  });
});
