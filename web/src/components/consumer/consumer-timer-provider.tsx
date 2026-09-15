"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  TimerFinishRequestSchema,
  TimerResponseSchema,
  type Book,
  type TimerFinishSuccess,
} from "@/lib/product/contracts";
import {
  clearBrowserTimerState,
  durationSeconds,
  elapsedMilliseconds,
  formatTimerDuration,
  pauseTimerState,
  readTimerState,
  resumeTimerState,
  timerMaximumMilliseconds,
  timerMinimumMilliseconds,
  timerStorageKey,
  type TimerState,
  writeTimerState,
} from "@/lib/consumer/timer-state";
import { FloatingTimerBar } from "./floating-timer-bar";

export type TimerErrorCode =
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "offline"
  | "unavailable"
  | "active_other";

export type TimerStopResult =
  | { kind: "saved" | "discarded"; response: TimerFinishSuccess }
  | { kind: "error"; code: TimerErrorCode }
  | { kind: "none" };

type TimerBookInput = Pick<Book, "id" | "title" | "imageUrl">;

type TimerContextValue = {
  timer: TimerState | null;
  elapsedMilliseconds: number;
  elapsedLabel: string;
  isHydrated: boolean;
  isStopping: boolean;
  errorCode: TimerErrorCode | null;
  lastResult: TimerStopResult | null;
  startTimer: (book: TimerBookInput) => boolean;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<TimerStopResult>;
  clearTimer: () => void;
  clearResult: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function normalizeTimerError(value: unknown): TimerErrorCode {
  if (value === "unauthorized" || value === "not_found" || value === "conflict" || value === "offline" || value === "unavailable") {
    return value;
  }
  return "unavailable";
}

export function ConsumerTimerProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: "ko" | "en";
}) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isHydrated, setIsHydrated] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [errorCode, setErrorCode] = useState<TimerErrorCode | null>(null);
  const [lastResult, setLastResult] = useState<TimerStopResult | null>(null);
  const stoppingPromise = useRef<Promise<TimerStopResult> | null>(null);

  const clearTimer = useCallback(() => {
    clearBrowserTimerState();
    setTimer(null);
    setErrorCode(null);
    setLastResult(null);
  }, []);

  useEffect(() => {
    try {
      setTimer(readTimerState(window.localStorage));
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearTimer();
    });
    const handleLogout = () => clearTimer();
    window.addEventListener("bookgolas:logout", handleLogout);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("bookgolas:logout", handleLogout);
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!timer || !isHydrated) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isHydrated, timer]);

  const elapsed = timer ? elapsedMilliseconds(timer, now) : 0;

  const startTimer = useCallback((book: TimerBookInput) => {
    if (timer && timer.bookId !== book.id) {
      setErrorCode("active_other");
      return false;
    }
    if (timer) return false;
    const startedAt = new Date();
    const next: TimerState = {
      bookId: book.id,
      bookTitle: book.title,
      bookImageUrl: book.imageUrl,
      sessionId: crypto.randomUUID(),
      sessionStartedAt: startedAt.toISOString(),
      segmentStartedAt: startedAt.toISOString(),
      accumulatedMilliseconds: 0,
      status: "running",
    };
    writeTimerState(window.localStorage, next);
    setTimer(next);
    setErrorCode(null);
    setLastResult(null);
    return true;
  }, [timer]);

  const pauseTimer = useCallback(() => {
    if (!timer || timer.status !== "running") return;
    const next = pauseTimerState(timer, new Date());
    writeTimerState(window.localStorage, next);
    setTimer(next);
  }, [timer]);

  const resumeTimer = useCallback(() => {
    if (!timer || timer.status !== "paused") return;
    const next = resumeTimerState(timer, new Date());
    writeTimerState(window.localStorage, next);
    setTimer(next);
    setErrorCode(null);
  }, [timer]);

  const stopTimer = useCallback((): Promise<TimerStopResult> => {
    if (stoppingPromise.current) return stoppingPromise.current;
    if (!timer) return Promise.resolve({ kind: "none" });

    const current = timer;
    const finish = async (): Promise<TimerStopResult> => {
      setIsStopping(true);
      setErrorCode(null);

      try {
        const endedAt = new Date().toISOString();
        const request = TimerFinishRequestSchema.parse({
          action: "finish",
          locale,
          bookId: current.bookId,
          startedAt: current.sessionStartedAt,
          endedAt,
          durationSeconds: durationSeconds(elapsedMilliseconds(current, Date.now())),
          idempotencyKey: current.sessionId,
        });
        const response = await fetch("/api/consumer/timer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          cache: "no-store",
        });
        const body: unknown = await response.json().catch(() => null);
        const parsed = TimerResponseSchema.safeParse(body);
        if (!response.ok || !parsed.success || "error" in parsed.data) {
          const code = parsed.success && "error" in parsed.data
            ? normalizeTimerError(parsed.data.error.code)
            : "unavailable";
          setErrorCode(code);
          return { kind: "error", code };
        }
        clearBrowserTimerState();
        setTimer(null);
        setLastResult({ kind: parsed.data.kind, response: parsed.data });
        window.dispatchEvent(new CustomEvent("bookgolas:timer-saved", { detail: parsed.data }));
        return { kind: parsed.data.kind, response: parsed.data };
      } catch {
        const code = "offline" as const;
        setErrorCode(code);
        return { kind: "error", code };
      } finally {
        setIsStopping(false);
      }
    };
    const operation = finish();
    stoppingPromise.current = operation;
    const clearStoppingPromise = () => {
      stoppingPromise.current = null;
    };
    void operation.then(clearStoppingPromise, clearStoppingPromise);
    return operation;
  }, [locale, timer]);

  useEffect(() => {
    if (!timer || elapsed < timerMaximumMilliseconds) return;
    if (!stoppingPromise.current) void stopTimer();
  }, [elapsed, stopTimer, timer]);

  const contextValue = useMemo<TimerContextValue>(() => ({
    timer,
    elapsedMilliseconds: elapsed,
    elapsedLabel: formatTimerDuration(elapsed),
    isHydrated,
    isStopping,
    errorCode,
    lastResult,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    clearTimer,
    clearResult: () => setLastResult(null),
  }), [clearTimer, elapsed, errorCode, isHydrated, isStopping, lastResult, pauseTimer, resumeTimer, startTimer, stopTimer, timer]);

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
      <FloatingTimerBar locale={locale} />
    </TimerContext.Provider>
  );
}

export function useConsumerTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useConsumerTimer must be used inside ConsumerTimerProvider");
  return context;
}

export function timerDurationLabel(milliseconds: number): string {
  return formatTimerDuration(Math.min(timerMaximumMilliseconds, Math.max(timerMinimumMilliseconds, milliseconds)));
}

export { timerStorageKey };
