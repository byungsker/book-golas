import { describe, expect, it } from "vitest";
import {
  clearBrowserTimerState,
  durationSeconds,
  elapsedMilliseconds,
  formatTimerDuration,
  pauseTimerState,
  readTimerState,
  resumeTimerState,
  timerMaximumMilliseconds,
  timerStorageKey,
  type TimerState,
  writeTimerState,
} from "./timer-state";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function state(overrides: Partial<TimerState> = {}): TimerState {
  return {
    bookId: "00000000-0000-4000-8000-000000004361",
    bookTitle: "The Reading Atlas",
    bookImageUrl: null,
    sessionId: "00000000-0000-4000-8000-000000005361",
    sessionStartedAt: "2026-09-16T00:00:00.000Z",
    segmentStartedAt: "2026-09-16T00:10:00.000Z",
    accumulatedMilliseconds: 0,
    status: "running",
    ...overrides,
  };
}

describe("browser reading timer state", () => {
  it("round-trips valid state and rejects corrupt storage", () => {
    const storage = memoryStorage();
    const initial = state();
    expect(writeTimerState(storage, initial)).toBe(true);
    expect(readTimerState(storage)).toEqual(initial);
    storage.setItem(timerStorageKey, "{broken");
    expect(readTimerState(storage)).toBeNull();
  });

  it("pauses and resumes without losing accumulated time", () => {
    const initial = state();
    const paused = pauseTimerState(initial, new Date("2026-09-16T00:10:12.500Z"));
    expect(paused).toMatchObject({
      status: "paused",
      segmentStartedAt: null,
      accumulatedMilliseconds: 12_500,
    });
    const resumed = resumeTimerState(paused, new Date("2026-09-16T00:12:00.000Z"));
    expect(resumed).toMatchObject({ status: "running", segmentStartedAt: "2026-09-16T00:12:00.000Z" });
    expect(elapsedMilliseconds(resumed, Date.parse("2026-09-16T00:12:03.250Z"))).toBe(15_750);
  });

  it("caps restored and running sessions at eight hours", () => {
    const old = state({
      sessionStartedAt: "2026-09-15T16:00:00.000Z",
      segmentStartedAt: "2026-09-15T16:00:00.000Z",
    });
    expect(elapsedMilliseconds(old, Date.parse("2026-09-16T01:00:00.000Z"))).toBe(timerMaximumMilliseconds);
    expect(durationSeconds(timerMaximumMilliseconds + 999_999)).toBe(28_800);
  });

  it("formats and clears browser state", () => {
    const storage = memoryStorage();
    writeTimerState(storage, state());
    expect(formatTimerDuration(3_661_000)).toBe("01:01:01");
    clearBrowserTimerState(storage);
    expect(readTimerState(storage)).toBeNull();
  });
});
