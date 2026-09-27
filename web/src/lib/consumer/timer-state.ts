import { BookIdSchema, RequestIdSchema } from "@/lib/product/contracts";

export const timerStorageKey = "bookgolas.reading-timer.v1";
export const timerMinimumMilliseconds = 30_000;
export const timerMaximumMilliseconds = 28_800_000;

export type TimerBook = {
  id: string;
  title: string;
  imageUrl: string | null;
};

export type TimerState = {
  bookId: string;
  bookTitle: string;
  bookImageUrl: string | null;
  sessionId: string;
  sessionStartedAt: string;
  segmentStartedAt: string | null;
  accumulatedMilliseconds: number;
  status: "running" | "paused";
};

type TimerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseTimerState(value: unknown): TimerState | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!BookIdSchema.safeParse(candidate.bookId).success) return null;
  if (!RequestIdSchema.safeParse(candidate.sessionId).success) return null;
  if (typeof candidate.bookTitle !== "string" || !candidate.bookTitle.trim()) return null;
  if (candidate.bookImageUrl !== null && typeof candidate.bookImageUrl !== "string") return null;
  if (!isIsoDate(candidate.sessionStartedAt)) return null;
  if (candidate.segmentStartedAt !== null && !isIsoDate(candidate.segmentStartedAt)) return null;
  if (!isNonNegativeInteger(candidate.accumulatedMilliseconds)) return null;
  if (candidate.status !== "running" && candidate.status !== "paused") return null;
  if (candidate.status === "running" && candidate.segmentStartedAt === null) return null;
  if (candidate.status === "paused" && candidate.segmentStartedAt !== null) return null;
  return {
    bookId: candidate.bookId as string,
    bookTitle: candidate.bookTitle,
    bookImageUrl: candidate.bookImageUrl,
    sessionId: candidate.sessionId as string,
    sessionStartedAt: candidate.sessionStartedAt,
    segmentStartedAt: candidate.segmentStartedAt,
    accumulatedMilliseconds: candidate.accumulatedMilliseconds,
    status: candidate.status,
  };
}

export function readTimerState(storage: TimerStorage): TimerState | null {
  try {
    const raw = storage.getItem(timerStorageKey);
    if (!raw) return null;
    return parseTimerState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeTimerState(storage: TimerStorage, state: TimerState): boolean {
  try {
    storage.setItem(timerStorageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearBrowserTimerState(storage?: TimerStorage): void {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    target?.removeItem(timerStorageKey);
  } catch {
    return;
  }
}

export function broadcastBrowserLogout(): void {
  clearBrowserTimerState();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("bookgolas:logout"));
}

export function elapsedMilliseconds(state: TimerState, now = Date.now()): number {
  const segmentStart = state.segmentStartedAt ? Date.parse(state.segmentStartedAt) : null;
  const runningMilliseconds =
    state.status === "running" && segmentStart !== null
      ? Math.max(0, now - segmentStart)
      : 0;
  return Math.min(
    timerMaximumMilliseconds,
    state.accumulatedMilliseconds + runningMilliseconds,
  );
}

export function pauseTimerState(state: TimerState, now = new Date()): TimerState {
  if (state.status !== "running") return state;
  return {
    ...state,
    accumulatedMilliseconds: elapsedMilliseconds(state, now.getTime()),
    segmentStartedAt: null,
    status: "paused",
  };
}

export function resumeTimerState(state: TimerState, now = new Date()): TimerState {
  if (state.status !== "paused") return state;
  return {
    ...state,
    segmentStartedAt: now.toISOString(),
    status: "running",
  };
}

export function formatTimerDuration(milliseconds: number): string {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${remainder}`;
}

export function durationSeconds(milliseconds: number): number {
  return Math.min(timerMaximumMilliseconds / 1000, Math.floor(Math.max(0, milliseconds) / 1000));
}
