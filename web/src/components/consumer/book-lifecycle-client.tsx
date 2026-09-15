"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  Pencil,
  Save,
  Target,
} from "lucide-react";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookLifecycleResponseSchema,
  canTransitionBookStatus,
  getBookSchedulePreview,
  type Book,
  type BookSearchResult,
  type BookStatus,
} from "@/lib/product/contracts";
import type { ConsumerLocale } from "@/lib/consumer/paths";

type LifecycleMode = "create" | "view" | "edit";
type SaveState = "idle" | "saving" | "saved" | "error";
type StatusOption = Extract<BookStatus, "planned" | "reading" | "completed" | "will_retry">;

type LifecycleError = {
  code: string;
  message: string;
  status: number;
};

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 text-sm text-[var(--blab-text-primary)] outline-none transition focus:border-[var(--blab-color-primary)] focus:ring-2 focus:ring-[var(--blab-color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
const statusOptions: readonly StatusOption[] = ["planned", "reading", "completed", "will_retry"];
const editableCreateStatuses: readonly StatusOption[] = ["planned", "reading"];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateToIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function isoToDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function parseError(body: unknown, status: number): LifecycleError {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: { code?: unknown; message?: unknown } }).error;
    if (error && typeof error.code === "string" && typeof error.message === "string") {
      return { code: error.code, message: error.message, status };
    }
  }
  return { code: "unavailable", message: "Book lifecycle request failed.", status };
}

function initialForm(book: BookSearchResult) {
  const startDate = todayInputValue();
  return {
    title: book.title,
    author: book.author,
    totalPages: String(book.totalPages ?? 0),
    startDate,
    targetDate: addDays(startDate, 14),
    plannedStartDate: addDays(startDate, 1),
    hasPlannedDate: true,
    status: "reading" as BookStatus,
    dailyTargetPages: book.totalPages ? String(Math.ceil(book.totalPages / 14)) : "",
    priority: "",
  };
}

function formFromBook(book: Book) {
  return {
    title: book.title,
    author: book.author ?? "",
    totalPages: String(book.totalPages),
    startDate: isoToDateInput(book.startDate),
    targetDate: isoToDateInput(book.targetDate),
    plannedStartDate: isoToDateInput(book.plannedStartDate),
    hasPlannedDate: Boolean(book.plannedStartDate),
    status: book.status,
    dailyTargetPages: book.dailyTargetPages === null ? "" : String(book.dailyTargetPages),
    priority: book.priority === null ? "" : String(book.priority),
  };
}

function statusLabel(status: StatusOption, t: (key: string) => string): string {
  return t(`status.${status}`);
}

export function BookLifecycleClient({
  locale,
  selectedBook,
}: {
  locale: ConsumerLocale;
  selectedBook: BookSearchResult;
}) {
  const t = useTranslations("consumer.bookLifecycle");
  const router = useRouter();
  const [mode, setMode] = useState<LifecycleMode>("create");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedBook, setSavedBook] = useState<Book | null>(null);
  const [saveError, setSaveError] = useState<LifecycleError | null>(null);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [form, setForm] = useState(() => initialForm(selectedBook));

  useEffect(() => {
    setMode("create");
    setSaveState("idle");
    setSavedBook(null);
    setSaveError(null);
    setForm(initialForm(selectedBook));
  }, [selectedBook]);

  const totalPagesNumber = form.totalPages.trim() === "" ? 0 : Number(form.totalPages);
  const dailyTargetNumber = form.dailyTargetPages.trim() === "" ? null : Number(form.dailyTargetPages);
  const priorityNumber = form.priority.trim() === "" ? null : Number(form.priority);
  const effectiveStartDate =
    form.status === "planned" && form.hasPlannedDate && form.plannedStartDate
      ? form.plannedStartDate
      : form.startDate;

  const schedulePreview = useMemo(() => {
    if (!form.startDate || !form.targetDate || !Number.isSafeInteger(totalPagesNumber) || totalPagesNumber < 0) return null;
    try {
      return getBookSchedulePreview({
        startDate: dateToIso(effectiveStartDate),
        targetDate: dateToIso(form.targetDate),
        totalPages: totalPagesNumber,
        dailyTargetPages: Number.isSafeInteger(dailyTargetNumber) && dailyTargetNumber !== null && dailyTargetNumber > 0 ? dailyTargetNumber : null,
      });
    } catch {
      return null;
    }
  }, [dailyTargetNumber, effectiveStartDate, form.startDate, form.targetDate, totalPagesNumber]);

  function markDirty() {
    if (saveState !== "saving") {
      setSaveState("idle");
      setSaveError(null);
    }
  }

  function setField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function chooseStatus(status: StatusOption) {
    setForm((current) => ({
      ...current,
      status,
      plannedStartDate: status === "planned" ? current.plannedStartDate || addDays(current.startDate, 1) : "",
      hasPlannedDate: status === "planned" ? current.hasPlannedDate : false,
    }));
    markDirty();
  }

  function togglePlannedDate(checked: boolean) {
    setForm((current) => ({
      ...current,
      hasPlannedDate: checked,
      plannedStartDate: checked ? current.plannedStartDate || addDays(current.startDate, 1) : "",
    }));
    markDirty();
  }

  function validateForm(): string | null {
    if (!form.title.trim()) return t("validation.title");
    if (!Number.isSafeInteger(totalPagesNumber) || totalPagesNumber < 0) return t("validation.pages");
    if (!form.startDate || !form.targetDate) return t("validation.datesRequired");
    if (form.status === "planned" && form.hasPlannedDate && !form.plannedStartDate) return t("validation.plannedDate");
    if (Date.parse(dateToIso(form.targetDate)) < Date.parse(dateToIso(effectiveStartDate))) return t("validation.dateRange");
    if (form.dailyTargetPages.trim() !== "" && (!Number.isSafeInteger(dailyTargetNumber) || dailyTargetNumber === null || dailyTargetNumber <= 0)) return t("validation.dailyTarget");
    if (form.priority.trim() !== "" && (!Number.isSafeInteger(priorityNumber) || priorityNumber === null || priorityNumber < 1 || priorityNumber > 4)) return t("validation.priority");
    return null;
  }

  function openScheduleEditor() {
    setScheduleDraft(form.dailyTargetPages || (schedulePreview ? String(schedulePreview.dailyTargetPages) : ""));
    setScheduleError("");
    setScheduleEditorOpen(true);
  }

  function saveScheduleDraft() {
    const value = Number(scheduleDraft);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setScheduleError(t("validation.dailyTarget"));
      return;
    }
    setField("dailyTargetPages", String(value));
    setScheduleEditorOpen(false);
  }

  async function saveBook() {
    const validationError = validateForm();
    if (validationError) {
      setSaveError({ code: "validation_error", message: validationError, status: 400 });
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    setSaveError(null);
    const status = form.status as BookStatus;
    const bookData = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      startDate: dateToIso(effectiveStartDate),
      targetDate: dateToIso(form.targetDate),
      plannedStartDate: status === "planned" && form.hasPlannedDate && form.plannedStartDate ? dateToIso(form.plannedStartDate) : null,
      totalPages: totalPagesNumber,
      status,
      imageUrl: selectedBook.imageUrl,
      genre: selectedBook.genre,
      publisher: selectedBook.publisher,
      isbn: selectedBook.isbn,
      aladinUrl: selectedBook.aladinUrl,
      price: selectedBook.price,
      dailyTargetPages: dailyTargetNumber,
      priority: priorityNumber,
    };
    const action = mode === "edit" ? "update" : "create";
    const body = action === "create"
      ? { action, locale, book: bookData }
      : {
          action,
          locale,
          book: {
            bookId: savedBook?.id,
            title: bookData.title,
            author: bookData.author,
            startDate: bookData.startDate,
            targetDate: bookData.targetDate,
            plannedStartDate: bookData.plannedStartDate,
            status: bookData.status,
            dailyTargetPages: bookData.dailyTargetPages,
            priority: bookData.priority,
          },
        };

    try {
      const response = await fetch("/api/consumer/book-lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const responseBody: unknown = await response.json().catch(() => null);
      if (!response.ok) throw parseError(responseBody, response.status);
      const parsed = BookLifecycleResponseSchema.safeParse(responseBody);
      if (!parsed.success) throw { code: "unavailable", message: t("errors.malformed"), status: 503 } satisfies LifecycleError;
      setSavedBook(parsed.data.book);
      setSaveState("saved");
      setMode("view");
      router.refresh();
    } catch (error) {
      const typed = error && typeof error === "object" && "code" in error && "message" in error
        ? error as LifecycleError
        : { code: "offline", message: t("errors.offline"), status: 503 };
      setSaveError(typed);
      setSaveState("error");
    }
  }

  function editSavedBook() {
    if (!savedBook) return;
    setForm(formFromBook(savedBook));
    setSaveError(null);
    setSaveState("idle");
    setMode("edit");
  }

  function renderSaveError() {
    if (!saveError) return null;
    const message = saveError.code === "validation_error"
      ? saveError.message
      : saveError.code === "unauthorized"
        ? t("errors.unauthorized")
        : saveError.code === "consent_required"
          ? t("errors.consent")
          : saveError.code === "quota_exceeded"
            ? t("errors.quota")
            : saveError.code === "conflict"
              ? t("errors.conflict")
              : saveError.code === "not_found"
                ? t("errors.notFound")
                : saveError.code === "offline"
                  ? t("errors.offline")
                  : t("errors.generic");
    const needsAccount = saveError.code === "unauthorized" || saveError.code === "consent_required" || saveError.code === "quota_exceeded";
    return (
      <div className="mt-5 rounded-2xl border border-[var(--blab-color-error)]/30 bg-[var(--blab-color-error)]/10 p-4" data-testid="book-lifecycle-error" data-error-code={saveError.code} role="alert">
        <p className="text-sm leading-6 text-[var(--blab-color-error)]">{message}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {needsAccount ? <Link href={saveError.code === "unauthorized" ? `/${locale}/auth/sign-in` : `/${locale}/account`} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--blab-color-primary)] px-3 py-2 text-sm font-semibold text-white">{saveError.code === "unauthorized" ? t("errors.signIn") : t("errors.openSettings")}</Link> : null}
          {!needsAccount ? <button type="button" data-testid="book-lifecycle-retry" onClick={() => void saveBook()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-3 py-2 text-sm font-semibold text-[var(--blab-text-primary)] transition hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><LoaderCircle aria-hidden="true" size={16} />{t("retry")}</button> : null}
        </div>
      </div>
    );
  }

  const visibleStatuses = mode === "create"
    ? editableCreateStatuses
    : statusOptions.filter((status) => savedBook && (status === savedBook.status || canTransitionBookStatus(savedBook.status, status)));

  if (mode === "view" && savedBook) {
    return (
      <ConsumerCard className="mt-5" data-testid="book-lifecycle-saved" data-save-state="saved">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--blab-color-success)]"><Check aria-hidden="true" className="mr-1 inline" size={16} />{t("saved")}</p>
            <h3 className="mt-2 text-xl font-semibold">{savedBook.title}</h3>
            <p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{savedBook.author || t("metadata.authorUnknown")}</p>
          </div>
          <ConsumerButton type="button" variant="secondary" text={t("edit")} icon={<Pencil aria-hidden="true" size={16} />} onClick={editSavedBook} data-testid="book-lifecycle-edit" />
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--blab-glass-fill)] p-3"><dt className="text-[var(--blab-text-tertiary)]">{t("status.label")}</dt><dd className="mt-1 font-semibold">{statusLabel(savedBook.status, t)}</dd></div>
          <div className="rounded-2xl bg-[var(--blab-glass-fill)] p-3"><dt className="text-[var(--blab-text-tertiary)]">{t("schedule.targetDate")}</dt><dd className="mt-1 font-semibold">{isoToDateInput(savedBook.targetDate)}</dd></div>
          <div className="rounded-2xl bg-[var(--blab-glass-fill)] p-3"><dt className="text-[var(--blab-text-tertiary)]">{t("priority.label")}</dt><dd className="mt-1 font-semibold">{savedBook.priority ? t(`priority.values.${savedBook.priority}`) : t("priority.none")}</dd></div>
        </dl>
        <Link href={`/${locale}/home`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="book-lifecycle-home">{t("home")}</Link>
      </ConsumerCard>
    );
  }

  return (
    <ConsumerCard className="mt-5" data-testid="book-lifecycle-form" data-mode={mode} data-save-state={saveState} aria-busy={saveState === "saving"}>
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--blab-color-primary)]/12 text-[var(--blab-color-primary)]"><Target aria-hidden="true" size={20} /></div>
        <div>
          <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
          <h3 className="mt-1 text-xl font-semibold">{mode === "edit" ? t("editTitle") : t("title")}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("description")}</p>
        </div>
      </div>

      <form className="mt-6 grid gap-6" noValidate onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void saveBook(); }}>
        <section data-testid="book-lifecycle-metadata" aria-labelledby="book-lifecycle-metadata-heading">
          <h4 id="book-lifecycle-metadata-heading" className="text-sm font-semibold">{t("metadata.title")}</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">{t("metadata.bookTitle")}<input className={inputClassName} value={form.title} onChange={(event) => setField("title", event.target.value)} data-testid="book-lifecycle-title" /></label>
            <label className="grid gap-2 text-sm font-medium">{t("metadata.author")}<input className={inputClassName} value={form.author} onChange={(event) => setField("author", event.target.value)} data-testid="book-lifecycle-author" /></label>
            <label className="grid gap-2 text-sm font-medium">{t("metadata.totalPages")}<input className={inputClassName} type="number" min={0} step={1} inputMode="numeric" value={form.totalPages} onChange={(event) => setField("totalPages", event.target.value)} data-testid="book-lifecycle-total-pages" readOnly={mode === "edit"} /></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--blab-text-tertiary)]">
            {selectedBook.isbn ? <span className="rounded-full bg-[var(--blab-glass-fill)] px-2.5 py-1">{t("metadata.isbn")}: {selectedBook.isbn}</span> : null}
            {selectedBook.publisher ? <span className="rounded-full bg-[var(--blab-glass-fill)] px-2.5 py-1">{selectedBook.publisher}</span> : null}
            {selectedBook.genre ? <span className="rounded-full bg-[var(--blab-glass-fill)] px-2.5 py-1">{selectedBook.genre}</span> : null}
          </div>
        </section>

        <section aria-labelledby="book-lifecycle-status-heading">
          <h4 id="book-lifecycle-status-heading" className="text-sm font-semibold">{t("status.label")}</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="book-lifecycle-status">
            {visibleStatuses.map((status) => (
              <button key={status} type="button" data-testid={`book-lifecycle-status-${status}`} aria-pressed={form.status === status} onClick={() => chooseStatus(status)} className={`min-h-12 rounded-xl border px-4 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${form.status === status ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)]/12 text-[var(--blab-color-primary)]" : "border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)]"}`}>
                {statusLabel(status, t)}<span className="mt-1 block text-xs font-normal text-[var(--blab-text-tertiary)]">{t(`status.help.${status}`)}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="book-lifecycle-schedule-heading">
          <div className="flex items-center justify-between gap-3"><h4 id="book-lifecycle-schedule-heading" className="text-sm font-semibold">{t("schedule.title")}</h4><Clock3 aria-hidden="true" size={17} className="text-[var(--blab-color-primary)]" /></div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">{t("schedule.startDate")}<span className="relative"><CalendarDays aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--blab-text-tertiary)]" /><input className={`${inputClassName} pl-10`} type="date" value={form.startDate} onChange={(event) => setField("startDate", event.target.value)} data-testid="book-lifecycle-start-date" /></span></label>
            <label className="grid gap-2 text-sm font-medium">{t("schedule.targetDate")}<span className="relative"><CalendarDays aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--blab-text-tertiary)]" /><input className={`${inputClassName} pl-10`} type="date" min={effectiveStartDate || undefined} value={form.targetDate} onChange={(event) => setField("targetDate", event.target.value)} data-testid="book-lifecycle-target-date" /></span></label>
          </div>
          {form.status === "planned" ? <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={form.hasPlannedDate} onChange={(event) => togglePlannedDate(event.target.checked)} className="size-5 accent-[var(--blab-color-primary)]" data-testid="book-lifecycle-planned-date-toggle" /><span>{t("schedule.usePlannedDate")}</span></label> : null}
          {form.status === "planned" && form.hasPlannedDate ? <label className="mt-3 grid gap-2 text-sm font-medium">{t("schedule.plannedStartDate")}<input className={inputClassName} type="date" min={form.startDate || undefined} value={form.plannedStartDate} onChange={(event) => setField("plannedStartDate", event.target.value)} data-testid="book-lifecycle-planned-date" /></label> : null}
          <div className="mt-4 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] p-4" data-testid="book-lifecycle-schedule-preview">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{t("schedule.preview")}</p><button type="button" data-testid="book-lifecycle-schedule-edit" onClick={openScheduleEditor} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-[var(--blab-color-primary)] hover:bg-[var(--blab-color-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><Pencil aria-hidden="true" size={14} />{t("schedule.edit")}</button></div>
            {schedulePreview ? <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[var(--blab-text-tertiary)]">{t("schedule.targetDays")}</dt><dd className="mt-1 font-semibold">{schedulePreview.targetDays} {t("schedule.days")}</dd></div><div><dt className="text-[var(--blab-text-tertiary)]">{t("schedule.dailyGoal")}</dt><dd className="mt-1 font-semibold">{schedulePreview.dailyTargetPages} {t("schedule.pagesPerDay")}</dd></div></dl> : <ConsumerLoadingState label={t("schedule.previewUnavailable")} />}
          </div>
        </section>

        <section aria-labelledby="book-lifecycle-priority-heading">
          <h4 id="book-lifecycle-priority-heading" className="text-sm font-semibold">{t("priority.label")}</h4>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="book-lifecycle-priority">
            <button type="button" data-testid="book-lifecycle-priority-none" aria-pressed={priorityNumber === null} onClick={() => setField("priority", "")} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${priorityNumber === null ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)]/12 text-[var(--blab-color-primary)]" : "border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)]"}`}>{t("priority.none")}</button>
            {([1, 2, 3, 4] as const).map((priority) => <button key={priority} type="button" data-testid={`book-lifecycle-priority-${priority}`} aria-pressed={priorityNumber === priority} onClick={() => setField("priority", String(priority))} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${priorityNumber === priority ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)]/12 text-[var(--blab-color-primary)]" : "border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)]"}`}>{t(`priority.values.${priority}`)}</button>)}
          </div>
        </section>

        {saveError ? renderSaveError() : null}
        <ConsumerButton type="submit" variant="primary" text={saveState === "saving" ? t("saving") : mode === "edit" ? t("saveChanges") : t("save")} icon={saveState === "saving" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Save aria-hidden="true" size={17} />} disabled={saveState === "saving"} data-testid="book-lifecycle-save" />
      </form>

      <Dialog open={scheduleEditorOpen} onOpenChange={setScheduleEditorOpen}>
        <DialogContent className="w-full max-w-lg rounded-3xl border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-6 text-[var(--blab-text-primary)] shadow-[var(--blab-elevation-surface)]">
          <DialogHeader className="text-left"><DialogTitle>{t("schedule.dialogTitle")}</DialogTitle><DialogDescription>{t("schedule.dialogDescription")}</DialogDescription></DialogHeader>
          <label className="mt-4 grid gap-2 text-sm font-medium">{t("schedule.dailyTarget")}<input className={inputClassName} type="number" min={1} step={1} inputMode="numeric" value={scheduleDraft} onChange={(event) => { setScheduleDraft(event.target.value); setScheduleError(""); }} data-testid="book-lifecycle-schedule-dialog-input" /></label>
          {scheduleError ? <p className="mt-3 text-sm text-[var(--blab-color-error)]" role="alert">{scheduleError}</p> : null}
          <DialogFooter className="mt-5"><DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("schedule.cancel")} /></DialogClose><ConsumerButton type="button" variant="primary" text={t("schedule.save")} onClick={saveScheduleDraft} data-testid="book-lifecycle-schedule-dialog-save" /></DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsumerCard>
  );
}
