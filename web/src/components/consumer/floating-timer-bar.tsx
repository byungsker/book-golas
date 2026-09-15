"use client";

import Link from "next/link";
import { Clock3, Pause, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConsumerButton } from "@/components/consumer/blab-primitives";
import { useConsumerTimer } from "./consumer-timer-provider";

function errorMessageKey(code: string): "offline" | "generic" | "activeOther" {
  if (code === "offline") return "offline";
  if (code === "active_other") return "activeOther";
  return "generic";
}

export function FloatingTimerBar({ locale }: { locale: "ko" | "en" }) {
  const t = useTranslations("consumer.timer");
  const {
    timer,
    elapsedLabel,
    isHydrated,
    isStopping,
    errorCode,
    lastResult,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useConsumerTimer();

  const resultMessage = lastResult?.kind === "discarded"
    ? t("discarded")
    : lastResult?.kind === "saved"
      ? t("saved")
      : null;

  return (
    <div
      id="bookgolas-floating-timer-root"
      data-testid="consumer-timer-mount"
      data-timer-status={timer?.status ?? "idle"}
      data-timer-book-id={timer?.bookId ?? ""}
      className="fixed bottom-28 right-4 z-30 flex min-h-11 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] px-4 py-3 text-sm text-[var(--blab-text-secondary)] shadow-[var(--blab-elevation-surface)] lg:bottom-8 lg:right-8"
    >
      {!isHydrated ? (
        <>
          <Clock3 aria-hidden="true" size={18} />
          <span>{t("mount")}</span>
        </>
      ) : !timer ? (
        <>
          <Clock3 aria-hidden="true" size={18} />
          <span data-testid="timer-idle">{resultMessage ?? t("mount")}</span>
        </>
      ) : (
        <>
          <Link
            href={`/${locale}/books/${timer.bookId}`}
            className="min-w-0 flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
            data-testid="timer-active-book"
          >
            <span className="block max-w-40 truncate font-medium text-[var(--blab-text-primary)]">{timer.bookTitle}</span>
            <span className="mt-0.5 block text-xs text-[var(--blab-text-tertiary)]">{t(timer.status)}</span>
          </Link>
          <time className="shrink-0 font-mono text-sm font-semibold text-[var(--blab-text-primary)]" data-testid="timer-elapsed">
            {elapsedLabel}
          </time>
          {timer.status === "running" ? (
            <ConsumerButton
              type="button"
              variant="secondary"
              icon={<Pause aria-hidden="true" size={16} />}
              text={t("pause")}
              aria-label={t("pause")}
              onClick={pauseTimer}
              data-testid="timer-pause"
            />
          ) : (
            <ConsumerButton
              type="button"
              variant="secondary"
              icon={<Play aria-hidden="true" size={16} />}
              text={t("resume")}
              aria-label={t("resume")}
              onClick={resumeTimer}
              data-testid="timer-resume"
            />
          )}
          <ConsumerButton
            type="button"
            variant="destructive"
            icon={<Square aria-hidden="true" size={15} />}
            text={isStopping ? t("stopSaving") : t("stop")}
            aria-label={isStopping ? t("stopSaving") : t("stop")}
            loading={isStopping}
            loadingLabel={t("stopSaving")}
            disabled={isStopping}
            onClick={() => void stopTimer()}
            data-testid="timer-stop"
          />
        </>
      )}
      {errorCode ? (
        <span className="sr-only" role="alert" data-testid="timer-error">{t(`errors.${errorMessageKey(errorCode)}`)}</span>
      ) : null}
    </div>
  );
}
