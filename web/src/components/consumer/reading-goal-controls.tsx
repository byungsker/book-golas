"use client";

import { useState } from "react";
import { CalendarDays, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConsumerButton } from "@/components/consumer/blab-primitives";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsumerDialogContent as DialogContent } from "@/components/consumer/consumer-dialog-content";
import {
  ProgressScheduleRequestSchema,
  ProgressUiResponseSchema,
  type Book,
  type ProgressScheduleRequest,
} from "@/lib/product/contracts";

type ReadingGoalControlsProps = {
  readonly locale: "ko" | "en";
  readonly book: Book;
  readonly onBookUpdated: (book: Book) => void;
};

type GoalOverlay = "today-goal" | "daily-target" | "daily-target-confirm" | "update-target-date" | "schedule-change" | "schedule-change-preview" | null;
type MutationState = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

type SchedulePreview = {
  readonly dailyTargetPages: number;
  readonly finishDate: string;
};

function dateInputValue(value: string): string {
  return value.slice(0, 10);
}

function isoDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function recommendedDailyPages(book: Book): number {
  if (book.dailyTargetPages) return book.dailyTargetPages;
  const remainingPages = Math.max(0, book.totalPages - book.currentPage);
  const remainingDays = Math.max(1, Math.ceil((Date.parse(book.targetDate) - Date.now()) / 86_400_000));
  return Math.max(1, Math.ceil(remainingPages / remainingDays));
}

function previewSchedule(book: Book, dailyTargetPages: number): SchedulePreview {
  const remainingPages = Math.max(0, book.totalPages - book.currentPage);
  const remainingDays = Math.max(1, Math.ceil(remainingPages / dailyTargetPages));
  const today = new Date();
  const finishDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + remainingDays - 1));
  return { dailyTargetPages, finishDate: finishDate.toISOString() };
}

export function ReadingGoalControls({ locale, book, onBookUpdated }: ReadingGoalControlsProps) {
  const t = useTranslations("consumer.reading.goals");
  const [overlay, setOverlay] = useState<GoalOverlay>(null);
  const [dailyTarget, setDailyTarget] = useState(String(recommendedDailyPages(book)));
  const [targetDate, setTargetDate] = useState(dateInputValue(book.targetDate));
  const [mutationState, setMutationState] = useState<MutationState>("idle");
  const [latestBook, setLatestBook] = useState(book);
  const [pendingRequest, setPendingRequest] = useState<ProgressScheduleRequest | null>(null);

  function makeRequest(change: { readonly dailyTargetPages?: number; readonly targetDate?: string }): ProgressScheduleRequest | null {
    if (!latestBook.updatedAt) {
      setMutationState("error");
      return null;
    }
    return ProgressScheduleRequestSchema.parse({
      action: "update_schedule",
      locale,
      bookId: latestBook.id,
      expectedUpdatedAt: latestBook.updatedAt,
      idempotencyKey: crypto.randomUUID(),
      ...change,
    });
  }

  async function save(request: ProgressScheduleRequest): Promise<void> {
    setPendingRequest(request);
    if (!navigator.onLine) {
      setMutationState("offline");
      return;
    }
    setMutationState("saving");
    try {
      const response = await fetch("/api/consumer/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${request.expectedUpdatedAt}"`,
          "X-Bookgolas-Action-Key": `${request.bookId}:schedule:${request.expectedUpdatedAt}:${request.idempotencyKey}`,
        },
        body: JSON.stringify(request),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      const parsed = ProgressUiResponseSchema.safeParse(body);
      if (!parsed.success) {
        setMutationState(response.status === 409 ? "conflict" : "error");
        return;
      }
      if ("error" in parsed.data) {
        const code = parsed.data.error.code;
        setMutationState(code === "conflict" ? "conflict" : code === "offline" ? "offline" : "error");
        return;
      }
      if (!response.ok) {
        setMutationState(response.status === 409 ? "conflict" : "error");
        return;
      }
      if (parsed.data.kind !== "schedule_updated") {
        setMutationState("error");
        return;
      }
      setLatestBook(parsed.data.book);
      setDailyTarget(String(recommendedDailyPages(parsed.data.book)));
      setTargetDate(dateInputValue(parsed.data.book.targetDate));
      setMutationState("saved");
      setOverlay(null);
      setPendingRequest(null);
      onBookUpdated(parsed.data.book);
    } catch (error) {
      if (error instanceof TypeError) {
        setMutationState("offline");
        return;
      }
      throw error;
    }
  }

  function openDailyTarget(): void {
    setMutationState("idle");
    setOverlay("daily-target");
  }

  function reviewDailyTarget(): void {
    const value = Number(dailyTarget);
    if (!Number.isSafeInteger(value) || value < 1 || value > Math.max(1, latestBook.totalPages)) {
      setMutationState("error");
      return;
    }
    setMutationState("idle");
    setOverlay("daily-target-confirm");
  }

  function confirmDailyTarget(): void {
    const request = makeRequest({ dailyTargetPages: Number(dailyTarget) });
    if (request) void save(request);
  }

  function openScheduleChange(): void {
    setDailyTarget(String(recommendedDailyPages(latestBook)));
    setMutationState("idle");
    setOverlay("schedule-change");
  }

  function previewScheduleChange(): void {
    const value = Number(dailyTarget);
    if (!Number.isSafeInteger(value) || value < 1 || value > Math.max(1, latestBook.totalPages)) {
      setMutationState("error");
      return;
    }
    setMutationState("idle");
    setOverlay("schedule-change-preview");
  }

  function confirmScheduleChange(): void {
    const request = makeRequest({ dailyTargetPages: Number(dailyTarget) });
    if (request) void save(request);
  }

  function saveTargetDate(): void {
    const value = Date.parse(isoDate(targetDate));
    if (!targetDate || value < Date.parse(latestBook.startDate)) {
      setMutationState("error");
      return;
    }
    const request = makeRequest({ targetDate: isoDate(targetDate) });
    if (request) void save(request);
  }

  function retry(): void {
    if (pendingRequest && mutationState !== "saving") void save(pendingRequest);
  }

  const stateMessage = mutationState === "offline"
    ? t("offline")
    : mutationState === "conflict"
      ? t("conflict")
      : mutationState === "error"
        ? t("invalid")
        : mutationState === "saved"
          ? t("saved")
          : null;

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5" data-testid="reading-goals" data-goal-state={mutationState}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{t("title")}</p>
          <p className="mt-1 text-sm text-white/60" data-testid="today-goal-summary">{t("summary", { count: recommendedDailyPages(latestBook) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConsumerButton type="button" variant="secondary" icon={<Target aria-hidden="true" size={16} />} text={t("todayOpen")} onClick={() => setOverlay("today-goal")} data-testid="today-goal-open" />
          <ConsumerButton type="button" variant="secondary" icon={<Target aria-hidden="true" size={16} />} text={t("scheduleOpen")} onClick={openScheduleChange} data-testid="schedule-change-open" />
          <ConsumerButton type="button" variant="secondary" icon={<CalendarDays aria-hidden="true" size={16} />} text={t("dateOpen")} onClick={() => { setMutationState("idle"); setOverlay("update-target-date"); }} data-testid="update-target-date-open" />
        </div>
      </div>

      {stateMessage ? (
        <div className="mt-4 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white/80" role={mutationState === "saved" ? "status" : "alert"} data-testid="goal-mutation-state">
          <span data-testid={mutationState === "saved" ? "schedule-change-saved" : undefined}>{stateMessage}</span>
          {(mutationState === "offline" || mutationState === "error") && pendingRequest ? <ConsumerButton className="ml-3" type="button" variant="secondary" text={t("retry")} onClick={retry} data-testid="goal-retry" /> : null}
        </div>
      ) : null}

      <Dialog open={overlay === "today-goal"} onOpenChange={(open) => setOverlay(open ? "today-goal" : null)}>
        <DialogContent data-testid="today-goal" data-overlay-state="ready">
          <DialogHeader><DialogTitle>{t("todayTitle")}</DialogTitle><DialogDescription>{t("todayDescription", { count: recommendedDailyPages(latestBook) })}</DialogDescription></DialogHeader>
          <p className="rounded-2xl bg-[var(--blab-glass-fill)] p-5 text-center text-3xl font-semibold" data-testid="today-goal-pages">{recommendedDailyPages(latestBook)}</p>
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("close")} onClick={() => setOverlay(null)} /><ConsumerButton type="button" text={t("settings")} onClick={openDailyTarget} data-testid="today-goal-settings" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "daily-target"} onOpenChange={(open) => setOverlay(open ? "daily-target" : null)}>
        <DialogContent data-testid="daily-target" data-overlay-state={mutationState}>
          <DialogHeader><DialogTitle>{t("dailyTitle")}</DialogTitle><DialogDescription>{t("dailyDescription")}</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium">{t("dailyLabel")}<input type="number" min={1} max={Math.max(1, latestBook.totalPages)} value={dailyTarget} onChange={(event) => { setDailyTarget(event.target.value); setMutationState("idle"); }} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="daily-target-input" /></label>
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("cancel")} onClick={() => setOverlay(null)} /><ConsumerButton type="button" text={t("review")} onClick={reviewDailyTarget} data-testid="daily-target-save" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "daily-target-confirm"} onOpenChange={(open) => setOverlay(open ? "daily-target-confirm" : null)}>
        <DialogContent data-testid="daily-target-confirm" data-overlay-state={mutationState}>
          <DialogHeader><DialogTitle>{t("confirmTitle")}</DialogTitle><DialogDescription>{t("confirmDescription", { count: dailyTarget })}</DialogDescription></DialogHeader>
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("cancel")} onClick={openDailyTarget} data-testid="daily-target-cancel" /><ConsumerButton type="button" text={mutationState === "saving" ? t("saving") : t("confirm")} loading={mutationState === "saving"} loadingLabel={t("saving")} disabled={mutationState === "saving"} onClick={confirmDailyTarget} data-testid="daily-target-confirm-save" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "schedule-change"} onOpenChange={(open) => setOverlay(open ? "schedule-change" : null)}>
        <DialogContent data-testid="schedule-change" data-overlay-state={mutationState}>
          <DialogHeader><DialogTitle>{t("scheduleTitle")}</DialogTitle><DialogDescription>{t("scheduleDescription")}</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium">{t("dailyLabel")}<input type="number" min={1} max={Math.max(1, latestBook.totalPages)} value={dailyTarget} onChange={(event) => { setDailyTarget(event.target.value); setMutationState("idle"); }} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="schedule-change-daily-target" /></label>
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("cancel")} onClick={() => setOverlay(null)} data-testid="schedule-change-cancel" /><ConsumerButton type="button" text={t("preview")} onClick={previewScheduleChange} data-testid="schedule-change-preview-open" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "schedule-change-preview"} onOpenChange={(open) => setOverlay(open ? "schedule-change-preview" : null)}>
        <DialogContent data-testid="schedule-change-preview" data-overlay-state={mutationState}>
          <DialogHeader><DialogTitle>{t("previewTitle")}</DialogTitle><DialogDescription>{t("previewDescription")}</DialogDescription></DialogHeader>
          {Number.isSafeInteger(Number(dailyTarget)) && Number(dailyTarget) > 0 ? (() => {
            const preview = previewSchedule(latestBook, Number(dailyTarget));
            const finishDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(preview.finishDate));
            return <dl className="grid gap-3 rounded-2xl bg-[var(--blab-glass-fill)] p-5" data-testid="schedule-change-preview-summary" data-schedule-preview-pages={preview.dailyTargetPages} data-schedule-preview-date={preview.finishDate}><div className="flex justify-between gap-4"><dt>{t("previewPagesLabel")}</dt><dd>{t("previewPages", { count: preview.dailyTargetPages })}</dd></div><div className="flex justify-between gap-4"><dt>{t("previewDateLabel")}</dt><dd>{finishDate}</dd></div></dl>;
          })() : null}
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("cancel")} onClick={openScheduleChange} data-testid="schedule-change-preview-cancel" /><ConsumerButton type="button" text={mutationState === "saving" ? t("saving") : t("confirm")} loading={mutationState === "saving"} loadingLabel={t("saving")} disabled={mutationState === "saving"} onClick={confirmScheduleChange} data-testid="schedule-change-confirm" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "update-target-date"} onOpenChange={(open) => setOverlay(open ? "update-target-date" : null)}>
        <DialogContent data-testid="update-target-date" data-overlay-state={mutationState}>
          <DialogHeader><DialogTitle>{t("dateTitle")}</DialogTitle><DialogDescription>{t("dateDescription")}</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium">{t("dateLabel")}<input type="date" min={dateInputValue(latestBook.startDate)} value={targetDate} onChange={(event) => { setTargetDate(event.target.value); setMutationState("idle"); }} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="target-date-input" /></label>
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("cancel")} onClick={() => setOverlay(null)} /><ConsumerButton type="button" text={mutationState === "saving" ? t("saving") : t("saveDate")} loading={mutationState === "saving"} loadingLabel={t("saving")} disabled={mutationState === "saving"} onClick={saveTargetDate} data-testid="target-date-save" /></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
