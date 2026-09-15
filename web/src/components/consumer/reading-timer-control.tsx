"use client";

import { useState } from "react";
import { Clock3, Pause, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConsumerButton, ConsumerCard } from "@/components/consumer/blab-primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Book } from "@/lib/product/contracts";
import { useConsumerTimer } from "./consumer-timer-provider";

type ReadingTimerControlProps = {
  book: Pick<Book, "id" | "title" | "imageUrl">;
};

function errorMessageKey(code: string): "unauthorized" | "notFound" | "conflict" | "offline" | "generic" | "activeOther" {
  if (code === "unauthorized") return "unauthorized";
  if (code === "not_found") return "notFound";
  if (code === "conflict") return "conflict";
  if (code === "offline") return "offline";
  if (code === "active_other") return "activeOther";
  return "generic";
}

export function ReadingTimerControl({ book }: ReadingTimerControlProps) {
  const t = useTranslations("consumer.timer");
  const [open, setOpen] = useState(false);
  const {
    timer,
    elapsedLabel,
    isHydrated,
    isStopping,
    errorCode,
    lastResult,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useConsumerTimer();

  const isCurrentBook = timer?.bookId === book.id;
  const isOtherBook = Boolean(timer && !isCurrentBook);

  function start() {
    if (startTimer(book)) setOpen(false);
  }

  async function stop() {
    await stopTimer();
  }

  return (
    <ConsumerCard className="mt-6" data-testid="reading-timer-control">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--blab-color-primary)]/10 text-[var(--blab-color-primary)]">
            <Clock3 aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--blab-text-primary)]">{t("title")}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--blab-text-secondary)]">{t("description")}</p>
          </div>
        </div>
        <ConsumerButton
          type="button"
          variant={isCurrentBook ? "secondary" : "primary"}
          icon={isCurrentBook ? <Clock3 aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}
          text={isCurrentBook ? t("open") : t("start")}
          disabled={!isHydrated || isOtherBook}
          onClick={() => setOpen(true)}
          data-testid="reading-timer-open"
        />
      </div>

      {isOtherBook ? (
        <p className="mt-4 rounded-xl bg-amber-300/10 px-4 py-3 text-sm text-amber-100" role="status" data-testid="timer-active-other">
          {t("activeOther")}
        </p>
      ) : null}

      {lastResult?.kind === "saved" ? (
        <p className="mt-4 rounded-xl bg-[var(--blab-color-success)]/10 px-4 py-3 text-sm text-[var(--blab-color-success)]" role="status" data-testid="timer-saved">
          {t("saved")}
        </p>
      ) : null}
      {lastResult?.kind === "discarded" ? (
        <p className="mt-4 rounded-xl bg-amber-300/10 px-4 py-3 text-sm text-amber-100" role="status" data-testid="timer-discarded">
          {t("discarded")}
        </p>
      ) : null}
      {errorCode ? (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert" data-testid="timer-control-error">
          {t(`errors.${errorMessageKey(errorCode)}`)}
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="reading-timer-dialog">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-5 text-center">
            <p className="truncate text-sm text-[var(--blab-text-secondary)]">{book.title}</p>
            <time className="mt-3 block font-mono text-4xl font-semibold tracking-tight text-[var(--blab-text-primary)]" data-testid="timer-modal-elapsed">
              {isCurrentBook ? elapsedLabel : "00:00:00"}
            </time>
            {isCurrentBook ? <p className="mt-2 text-sm text-[var(--blab-text-tertiary)]">{t(timer?.status ?? "idle")}</p> : null}
          </div>

          <DialogFooter className="mt-2 sm:flex-row sm:justify-end">
            {!timer ? (
              <ConsumerButton
                type="button"
                variant="primary"
                icon={<Play aria-hidden="true" size={17} />}
                text={t("start")}
                onClick={start}
                data-testid="timer-start"
              />
            ) : isCurrentBook ? (
              <>
                {timer.status === "running" ? (
                  <ConsumerButton
                    type="button"
                    variant="secondary"
                    icon={<Pause aria-hidden="true" size={17} />}
                    text={t("pause")}
                    onClick={pauseTimer}
                    data-testid="timer-modal-pause"
                  />
                ) : (
                  <ConsumerButton
                    type="button"
                    variant="secondary"
                    icon={<Play aria-hidden="true" size={17} />}
                    text={t("resume")}
                    onClick={resumeTimer}
                    data-testid="timer-modal-resume"
                  />
                )}
                <ConsumerButton
                  type="button"
                  variant="destructive"
                  icon={<Square aria-hidden="true" size={16} />}
                  text={isStopping ? t("stopSaving") : t("stop")}
                  loading={isStopping}
                  loadingLabel={t("stopSaving")}
                  disabled={isStopping}
                  onClick={() => void stop()}
                  data-testid="timer-modal-stop"
                />
              </>
            ) : (
              <ConsumerButton type="button" variant="secondary" text={t("close")} onClick={() => setOpen(false)} />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsumerCard>
  );
}
