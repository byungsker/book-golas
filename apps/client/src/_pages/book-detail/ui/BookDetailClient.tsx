"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Info,
  LoaderCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";
import {
  ConsumerButton,
  ConsumerCard,
} from "@/shared/ui";
import { ReadingTimerControl } from "@/features/reading-timer";
import { ProgressUpdater } from "@/features/reading-progress";
import { NotesHighlightsClient } from "@/features/notes-highlights";
import { BookImageCaptureClient } from "@/features/images-ocr";
import { RecallSearch as RecallClient } from "@/features/recall";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives";
import { ConsumerDialogContent as DialogContent } from "@/shared/ui";
import type { ConsumerLocale } from "@/shared/routing";
import { formatTimerDuration } from "@/features/reading-timer";
import { formatBookDate } from "@/entities/book";
import {
  BookDetailResponseSchema,
  BookLifecycleResponseSchema,
  canApplyBookDetailAction,
  type BookDetailAction,
} from "@/entities/book";
import { ReviewResponseSchema } from "@/features/review-share";
import type { Book, ProgressEvent } from "@/shared/api/contracts";
import type { ProductError } from "@/shared/api/product/errors";

type BookDetailClientProps = {
  locale: ConsumerLocale;
  initialBook: Book;
  initialTab: "detail" | "history";
  autoOpenScan: boolean;
  initialHistory: ProgressEvent[];
  initialHistoryState: "ready" | "error";
};

type DetailTab = "detail" | "history" | "memorable";
type DetailOverlay =
  | "reading-management"
  | "pause-reading-confirmation"
  | "delete-confirmation"
  | "batch-delete-confirmation"
  | "book-info"
  | "full-title"
  | "edit-planned-book"
  | "book-completion"
  | "book-review-prompt"
  | "review-link-editor"
  | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readError(value: unknown, status: number): ProductError {
  if (isRecord(value) && isRecord(value.error)) {
    const error = value.error;
    if (
      typeof error.code === "string" &&
      typeof error.message === "string" &&
      typeof error.status === "number" &&
      typeof error.retryable === "boolean"
    ) {
      return {
        code: error.code as ProductError["code"],
        message: error.message,
        status: error.status as ProductError["status"],
        retryable: error.retryable,
      };
    }
  }
  return {
    code: status === 409 ? "conflict" : "unavailable",
    message: "Book action failed.",
    status: status === 409 ? 409 : 503,
    retryable: true,
  };
}

function trustedExternalHref(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function actionIcon(action: BookDetailAction) {
  if (action === "start") return <Play aria-hidden="true" size={17} />;
  if (action === "resume") return <RotateCcw aria-hidden="true" size={17} />;
  if (action === "pause") return <Pause aria-hidden="true" size={17} />;
  if (action === "complete") return <CheckCircle2 aria-hidden="true" size={17} />;
  return <Trash2 aria-hidden="true" size={17} />;
}

const actionOrder: readonly BookDetailAction[] = [
  "start",
  "resume",
  "pause",
  "complete",
];

const actionTestIds: Record<BookDetailAction, string> = {
  start: "book-detail-action-start",
  resume: "book-detail-action-resume",
  pause: "book-detail-action-pause",
  complete: "book-detail-action-complete",
  delete: "book-detail-action-delete",
};

function dateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

export function BookDetailClient({
  locale,
  initialBook,
  initialTab,
  autoOpenScan,
  initialHistory,
  initialHistoryState,
}: BookDetailClientProps) {
  const t = useTranslations("consumer.bookDetail");
  const router = useRouter();
  const [book, setBook] = useState(initialBook);
  const [pendingAction, setPendingAction] = useState<BookDetailAction | null>(null);
  const [lastAction, setLastAction] = useState<BookDetailAction | null>(null);
  const [error, setError] = useState<ProductError | null>(null);
  const [successAction, setSuccessAction] = useState<BookDetailAction | null>(null);
  const [overlay, setOverlay] = useState<DetailOverlay>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>(autoOpenScan ? "memorable" : initialTab);
  const [plannedStartDate, setPlannedStartDate] = useState(dateInputValue(initialBook.plannedStartDate));
  const [priority, setPriority] = useState(initialBook.priority === null ? "" : String(initialBook.priority));
  const [plannedEditPending, setPlannedEditPending] = useState(false);
  const [plannedEditError, setPlannedEditError] = useState<ProductError | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [reviewLinkDraft, setReviewLinkDraft] = useState(initialBook.reviewLink ?? "");
  const [reviewLinkPending, setReviewLinkPending] = useState(false);
  const [reviewLinkError, setReviewLinkError] = useState<ProductError | null>(null);
  const scanRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoOpenScan || activeTab !== "memorable") return;
    const root = scanRootRef.current;
    if (!root) return;

    const openSource = () => {
      const trigger = root.querySelector<HTMLButtonElement>('[data-testid="add-memorable-page"]');
      if (!trigger) return false;
      trigger.click();
      return true;
    };
    if (openSource()) return;

    const observer = new MutationObserver(() => {
      if (openSource()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [activeTab, autoOpenScan]);

  useEffect(() => {
    function handleProgressUpdate(event: Event) {
      const value = (event as CustomEvent<unknown>).detail;
      if (!isRecord(value) || value.id !== initialBook.id) return;
      const nextCurrentPage = value.currentPage;
      const nextTotalPages = value.totalPages;
      const nextStatus = value.status;
      if (
        typeof nextCurrentPage !== "number" ||
        typeof nextTotalPages !== "number" ||
        typeof nextStatus !== "string" ||
        !["planned", "reading", "completed", "will_retry"].includes(nextStatus)
      ) {
        return;
      }
      setBook((previous) => ({
        ...previous,
        currentPage: nextCurrentPage,
        totalPages: nextTotalPages,
        status: nextStatus as Book["status"],
        attemptCount: typeof value.attemptCount === "number" ? value.attemptCount : previous.attemptCount,
        pausedAt: typeof value.pausedAt === "string" || value.pausedAt === null ? value.pausedAt : previous.pausedAt,
        updatedAt: typeof value.updatedAt === "string" || value.updatedAt === null ? value.updatedAt : previous.updatedAt,
      }));
    }

    function handleTimerSaved(event: Event) {
      const value = (event as CustomEvent<unknown>).detail;
      if (!isRecord(value) || !isRecord(value.book) || value.book.id !== initialBook.id) return;
      const nextTotalReadingSeconds = value.totalReadingSeconds;
      if (typeof nextTotalReadingSeconds !== "number") return;
      setBook((previous) => ({
        ...previous,
        totalReadingSeconds: nextTotalReadingSeconds,
      }));
    }

    window.addEventListener("bookgolas:progress-updated", handleProgressUpdate);
    window.addEventListener("bookgolas:timer-saved", handleTimerSaved);
    return () => {
      window.removeEventListener("bookgolas:progress-updated", handleProgressUpdate);
      window.removeEventListener("bookgolas:timer-saved", handleTimerSaved);
    };
  }, [initialBook.id]);

  const status = book.status;
  const transitionActions = actionOrder.filter((action) => canApplyBookDetailAction(status, action));
  const reviewHref = trustedExternalHref(book.reviewLink);
  const storeHref = trustedExternalHref(book.aladinUrl);

  function actionLabel(action: BookDetailAction): string {
    return t(`actions.${action}`);
  }

  function errorMessage(nextError: ProductError): string {
    if (nextError.code === "validation_error") return t("errors.invalidTransition");
    if (nextError.code === "not_found" || nextError.code === "forbidden") return t("errors.notFound");
    if (nextError.code === "unauthorized") return t("errors.unauthorized");
    if (nextError.code === "offline") return t("errors.offline");
    if (nextError.code === "conflict") return t("errors.conflict");
    return t("errors.generic");
  }

  async function executeAction(action: BookDetailAction) {
    if (pendingAction || deleted) return;
    setPendingAction(action);
    setLastAction(action);
    setError(null);
    setSuccessAction(null);

    try {
      const response = await fetch("/api/consumer/book-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(book.updatedAt ? { "If-Match": `"${book.updatedAt}"` } : {}),
          "X-Bookgolas-Action-Key": `${book.id}:${action}:${book.updatedAt ?? "initial"}`,
        },
        body: JSON.stringify({ action, locale, bookId: book.id }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = BookDetailResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw {
          code: "unavailable",
          message: "Malformed book detail response.",
          status: 503,
          retryable: true,
        } satisfies ProductError;
      }

      if (parsed.data.kind === "deleted") {
        setDeleted(true);
        setOverlay(null);
      } else {
        setBook(parsed.data.book);
        setSuccessAction(action);
        if (action === "complete") setOverlay("book-completion");
        else setOverlay(null);
        router.refresh();
      }
    } catch (caught) {
      const nextError = isRecord(caught) && typeof caught.code === "string"
        ? caught as ProductError
        : {
            code: "offline",
            message: "Book detail is offline.",
            status: 503,
            retryable: true,
          } satisfies ProductError;
      setError(nextError);
    } finally {
      setPendingAction(null);
    }
  }

  function selectTab(tab: DetailTab) {
    setActiveTab(tab);
    const suffix = tab === "history" ? "?tab=history" : "";
    router.replace(`/${locale}/books/${book.id}${suffix}`, { scroll: false });
  }

  function beginAction(action: BookDetailAction) {
    if (action === "pause") {
      setOverlay("pause-reading-confirmation");
      return;
    }
    if (action === "delete") {
      setOverlay("delete-confirmation");
      return;
    }
    void executeAction(action);
  }

  async function savePlannedBook() {
    if (plannedEditPending || book.status !== "planned") return;
    const plannedTimestamp = Date.parse(`${plannedStartDate}T00:00:00.000Z`);
    const priorityValue = priority === "" ? null : Number(priority);
    if (
      !plannedStartDate ||
      !Number.isFinite(plannedTimestamp) ||
      plannedTimestamp > Date.parse(book.targetDate) ||
      (priorityValue !== null && ![1, 2, 3, 4].includes(priorityValue))
    ) {
      setPlannedEditError({
        code: "validation_error",
        message: "Invalid planned book values.",
        status: 400,
        retryable: false,
      });
      return;
    }

    setPlannedEditPending(true);
    setPlannedEditError(null);
    try {
      const response = await fetch("/api/consumer/book-lifecycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(book.updatedAt ? { "If-Match": `"${book.updatedAt}"` } : {}),
          "X-Bookgolas-Action-Key": `${book.id}:update:${book.updatedAt ?? "initial"}`,
        },
        body: JSON.stringify({
          action: "update",
          locale,
          book: {
            bookId: book.id,
            plannedStartDate: new Date(plannedTimestamp).toISOString(),
            priority: priorityValue,
          },
        }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = BookLifecycleResponseSchema.safeParse(body);
      if (!parsed.success) throw readError(null, 503);
      setBook(parsed.data.book);
      setOverlay(null);
      setSuccessAction(null);
      router.refresh();
    } catch (caught) {
      setPlannedEditError(isRecord(caught) && typeof caught.code === "string"
        ? caught as ProductError
        : readError(null, 503));
    } finally {
      setPlannedEditPending(false);
    }
  }

  async function saveReviewLink(nextReviewLink: string | null) {
    if (reviewLinkPending) return;
    setReviewLinkPending(true);
    setReviewLinkError(null);
    try {
      const response = await fetch("/api/consumer/review-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          locale,
          bookId: book.id,
          rating: book.rating,
          review: book.review,
          longReview: book.longReview,
          reviewLink: nextReviewLink,
          idempotencyKey: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "00000000-0000-4000-8000-000000004433",
        }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = ReviewResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== "saved") throw readError(null, 503);
      setBook(parsed.data.book);
      setReviewLinkDraft(parsed.data.book.reviewLink ?? "");
      setOverlay(null);
      router.refresh();
    } catch (caught) {
      setReviewLinkError(isRecord(caught) && typeof caught.code === "string" ? caught as ProductError : readError(null, 503));
    } finally {
      setReviewLinkPending(false);
    }
  }

  if (deleted) {
    return (
      <div data-testid="book-detail-live" data-book-status="deleted">
        <ConsumerCard className="mt-6" data-testid="book-detail-deleted" role="status">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-[var(--blab-color-success)]" size={22} />
            <div>
              <h2 className="text-lg font-semibold text-[var(--blab-text-primary)]">{t("delete.deletedTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{t("delete.deletedDescription")}</p>
              <Link
                href={`/${locale}/home`}
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
              >
                {t("home")}
              </Link>
            </div>
          </div>
        </ConsumerCard>
      </div>
    );
  }

  return (
    <div
      data-testid="book-detail-live"
      data-book-status={status}
      data-active-tab={activeTab}
      data-auto-scan={autoOpenScan ? "true" : "false"}
    >
      <div className="mt-6 flex flex-wrap gap-2" data-testid="book-detail-utility-actions">
        <ConsumerButton type="button" variant="secondary" text={t("overlays.fullTitle.action")} icon={<BookOpen aria-hidden="true" size={16} />} onClick={() => setOverlay("full-title")} data-testid="book-detail-full-title-open" />
        <ConsumerButton type="button" variant="secondary" text={t("overlays.bookInfo.action")} icon={<Info aria-hidden="true" size={16} />} onClick={() => setOverlay("book-info")} data-testid="book-detail-info-open" />
        <ConsumerButton type="button" variant="secondary" text={t("overlays.management.action")} icon={<MoreHorizontal aria-hidden="true" size={16} />} onClick={() => setOverlay("reading-management")} data-testid="book-detail-management-open" />
        {status === "planned" ? <ConsumerButton type="button" variant="secondary" text={t("overlays.planned.action")} icon={<Pencil aria-hidden="true" size={16} />} onClick={() => setOverlay("edit-planned-book")} data-testid="book-detail-planned-edit-open" /> : null}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2" role="tablist" aria-label={t("tabs.label")} data-testid="book-detail-tabs">
        {(["detail", "history", "memorable"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className="min-h-11 rounded-xl bg-[var(--blab-glass-fill)] px-3 py-2 text-sm font-semibold text-[var(--blab-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] aria-selected:bg-[var(--blab-color-primary)] aria-selected:text-white"
            onClick={() => selectTab(tab)}
            data-testid={`book-detail-tab-${tab}`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {activeTab === "detail" ? <div role="tabpanel" data-testid="book-detail-detail-panel">
      <ConsumerCard className="mt-6" data-testid="book-detail-actions" data-status={status}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--blab-text-primary)]">{t("actions.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{t(`status.help.${status}`)}</p>
          </div>
          <span className="rounded-full bg-[var(--blab-color-primary)]/10 px-3 py-1 text-sm font-medium text-[var(--blab-color-primary)]">
            {t(`status.${status}`)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="book-detail-action-list">
          {transitionActions.map((action) => (
            <ConsumerButton
              key={action}
              type="button"
              variant="primary"
              text={pendingAction === action ? t("pending") : actionLabel(action)}
              icon={pendingAction === action ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : actionIcon(action)}
              loading={pendingAction === action}
              loadingLabel={t("pending")}
              disabled={pendingAction !== null}
              onClick={() => beginAction(action)}
              data-testid={actionTestIds[action]}
            />
          ))}
          <ConsumerButton
            type="button"
            variant="destructive"
            text={pendingAction === "delete" ? t("pending") : t("actions.delete")}
            icon={pendingAction === "delete" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : actionIcon("delete")}
            loading={pendingAction === "delete"}
            loadingLabel={t("pending")}
            disabled={pendingAction !== null}
            onClick={() => beginAction("delete")}
            data-testid="book-detail-action-delete"
          />
        </div>

        {status === "completed" ? (
          <p className="mt-4 text-sm text-[var(--blab-text-secondary)]" data-testid="book-detail-completed-state">
            {t("status.completedHelp")}
          </p>
        ) : null}

        {successAction ? (
          <p className="mt-4 rounded-xl bg-[var(--blab-color-success)]/10 px-4 py-3 text-sm text-[var(--blab-color-success)]" data-testid="book-detail-updated" role="status">
            {t("success", { action: actionLabel(successAction) })}
          </p>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100" data-testid="book-detail-action-error" role="alert">
            <p>{errorMessage(error)}</p>
            {lastAction && error.retryable ? (
              <ConsumerButton
                className="mt-3"
                type="button"
                variant="secondary"
                text={t("retry")}
                onClick={() => void executeAction(lastAction)}
                data-testid="book-detail-retry"
              />
            ) : null}
          </div>
        ) : null}
      </ConsumerCard>

      <ReadingTimerControl book={book} />

      <NotesHighlightsClient
        locale={locale}
        bookId={book.id}
        totalPages={book.totalPages}
      />

      <div className="mt-6">
        <RecallClient locale={locale} bookId={book.id} />
      </div>

      <ConsumerCard className="mt-6" data-testid="book-detail-metadata">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--blab-text-primary)]">{t("metadata.title")}</h2>
          <span className="text-sm text-[var(--blab-text-tertiary)]" data-testid="book-detail-attempt">
            {t("attempt", { count: book.attemptCount })}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.genre")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{book.genre ?? t("metadata.notAvailable")}</dd></div>
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.publisher")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{book.publisher ?? t("metadata.notAvailable")}</dd></div>
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.isbn")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{book.isbn ?? t("metadata.notAvailable")}</dd></div>
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.price")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{book.price === null ? t("metadata.notAvailable") : new Intl.NumberFormat(locale).format(book.price)}</dd></div>
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.createdAt")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{formatBookDate(book.createdAt, locale)}</dd></div>
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.updatedAt")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{formatBookDate(book.updatedAt, locale)}</dd></div>
          <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.totalReadingTime")}</dt><dd className="mt-1 font-mono font-medium text-[var(--blab-text-primary)]" data-testid="book-detail-total-reading-time">{formatTimerDuration((book.totalReadingSeconds ?? 0) * 1000)}</dd></div>
          {book.pausedAt ? <div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.pausedAt")}</dt><dd className="mt-1 font-medium text-[var(--blab-text-primary)]">{formatBookDate(book.pausedAt, locale)}</dd></div> : null}
        </dl>

          <div className="mt-6 border-t border-[var(--blab-glass-border)] pt-5" data-testid="book-detail-review">
            <h3 className="text-base font-semibold text-[var(--blab-text-primary)]">{t("review.title")}</h3>
            {book.review ? <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{book.review}</p> : null}
            {book.longReview ? <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{book.longReview}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link className="inline-flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)] underline-offset-4 hover:underline" href={`/${locale}/books/${book.id}/review`} data-testid="book-detail-review-editor-link">{t("review.edit")}</Link>
              {reviewHref ? <a className="inline-flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)] underline-offset-4 hover:underline" href={reviewHref} target="_blank" rel="noreferrer" data-testid="book-detail-review-link">{t("review.open")}<ExternalLink aria-hidden="true" size={15} /></a> : null}
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[var(--blab-color-primary)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => { setReviewLinkDraft(book.reviewLink ?? ""); setReviewLinkError(null); setOverlay("review-link-editor"); }} data-testid="review-link-editor-open"><Pencil aria-hidden="true" size={15} />{t("review.editLink")}</button>
            </div>
          </div>

        {storeHref ? <a className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)] underline-offset-4 hover:underline" href={storeHref} target="_blank" rel="noreferrer" data-testid="book-detail-store-link">{t("links.store")}<ExternalLink aria-hidden="true" size={15} /></a> : null}
      </ConsumerCard>
      </div> : null}

      {activeTab === "history" ? (
        <section className="mt-8" role="tabpanel" data-testid="book-detail-history-panel">
          <h2 className="text-xl font-semibold text-white">{t("tabs.history")}</h2>
          <ProgressUpdater
            locale={locale}
            bookId={book.id}
            currentPage={book.currentPage}
            totalPages={book.totalPages}
            status={book.status}
            attemptCount={book.attemptCount}
            initialBook={book}
            initialHistory={initialHistory}
            initialHistoryState={initialHistoryState}
          />
        </section>
      ) : null}

      {activeTab === "memorable" ? (
        <section ref={scanRootRef} role="tabpanel" data-testid="book-detail-memorable-panel">
          {autoOpenScan ? (
            <div className="mt-6 rounded-2xl bg-[var(--blab-color-primary)]/10 p-4 text-sm text-[var(--blab-text-secondary)]" role="status" data-testid="book-detail-scan-flow">
              <ScanLine aria-hidden="true" className="mr-2 inline text-[var(--blab-color-primary)]" size={17} />
              {t("tabs.scanOpened")}
            </div>
          ) : null}
          <BookImageCaptureClient locale={locale} bookId={book.id} totalPages={book.totalPages} />
        </section>
      ) : null}

      <Dialog open={overlay === "reading-management"} onOpenChange={(open) => setOverlay(open ? "reading-management" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="reading-management">
          <DialogHeader><DialogTitle>{t("overlays.management.title")}</DialogTitle><DialogDescription>{t("overlays.management.description")}</DialogDescription></DialogHeader>
          <div className="mt-4 grid gap-3">
            {status === "reading" ? <ConsumerButton type="button" variant="secondary" text={t("actions.pause")} onClick={() => setOverlay("pause-reading-confirmation")} data-testid="reading-management-pause" /> : null}
            <ConsumerButton type="button" variant="secondary" text={t("overlays.batchDelete.action")} onClick={() => setOverlay("batch-delete-confirmation")} data-testid="reading-management-batch-delete" />
            <ConsumerButton type="button" variant="destructive" text={t("actions.delete")} onClick={() => setOverlay("delete-confirmation")} data-testid="reading-management-delete" />
            <ConsumerButton type="button" variant="secondary" text={t("overlays.cancel")} onClick={() => setOverlay(null)} data-testid="reading-management-cancel" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "pause-reading-confirmation"} onOpenChange={(open) => setOverlay(open ? "pause-reading-confirmation" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="pause-reading-confirmation">
          <DialogHeader><DialogTitle>{t("overlays.pause.title")}</DialogTitle><DialogDescription>{t("overlays.pause.description")}</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4"><ConsumerButton type="button" variant="secondary" text={t("overlays.cancel")} onClick={() => setOverlay(null)} data-testid="pause-reading-cancel" /><ConsumerButton type="button" variant="primary" text={t("overlays.pause.confirm")} loading={pendingAction === "pause"} loadingLabel={t("pending")} onClick={() => void executeAction("pause")} data-testid="pause-reading-confirm" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "delete-confirmation"} onOpenChange={(open) => setOverlay(open ? "delete-confirmation" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="book-detail-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <ConsumerButton type="button" variant="secondary" text={t("delete.cancel")} onClick={() => setOverlay(null)} data-testid="book-detail-delete-cancel" />
            <ConsumerButton
              type="button"
              variant="destructive"
              text={t("delete.confirm")}
              loading={pendingAction === "delete"}
              loadingLabel={t("pending")}
              disabled={pendingAction !== null}
              onClick={() => void executeAction("delete")}
              data-testid="book-detail-delete-confirm"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "batch-delete-confirmation"} onOpenChange={(open) => setOverlay(open ? "batch-delete-confirmation" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="batch-delete-confirmation">
          <DialogHeader><DialogTitle>{t("overlays.batchDelete.title")}</DialogTitle><DialogDescription>{t("overlays.batchDelete.description")}</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4"><ConsumerButton type="button" variant="secondary" text={t("overlays.cancel")} onClick={() => setOverlay(null)} data-testid="batch-delete-cancel" /><ConsumerButton type="button" variant="destructive" text={t("overlays.batchDelete.reviewSelection")} onClick={() => { setOverlay(null); selectTab("memorable"); }} data-testid="batch-delete-confirm" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "book-info"} onOpenChange={(open) => setOverlay(open ? "book-info" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="book-info">
          <DialogHeader><DialogTitle>{t("overlays.bookInfo.title")}</DialogTitle><DialogDescription>{book.title}</DialogDescription></DialogHeader>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.publisher")}</dt><dd>{book.publisher ?? t("metadata.notAvailable")}</dd></div><div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.isbn")}</dt><dd>{book.isbn ?? t("metadata.notAvailable")}</dd></div><div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.genre")}</dt><dd>{book.genre ?? t("metadata.notAvailable")}</dd></div><div><dt className="text-[var(--blab-text-tertiary)]">{t("metadata.price")}</dt><dd>{book.price === null ? t("metadata.notAvailable") : new Intl.NumberFormat(locale).format(book.price)}</dd></div></dl>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "full-title"} onOpenChange={(open) => setOverlay(open ? "full-title" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="full-title"><DialogHeader><DialogTitle>{t("overlays.fullTitle.title")}</DialogTitle><DialogDescription>{t("overlays.fullTitle.description")}</DialogDescription></DialogHeader><p className="mt-4 break-words text-xl font-semibold" data-testid="full-title-value">{book.title}</p></DialogContent>
      </Dialog>

      <Dialog open={overlay === "edit-planned-book"} onOpenChange={(open) => { setOverlay(open ? "edit-planned-book" : null); setPlannedEditError(null); }}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="edit-planned-book">
          <DialogHeader><DialogTitle>{t("overlays.planned.title")}</DialogTitle><DialogDescription>{t("overlays.planned.description")}</DialogDescription></DialogHeader>
          <label className="mt-4 grid gap-2 text-sm font-medium">{t("overlays.planned.date")}<input type="date" value={plannedStartDate} max={dateInputValue(book.targetDate)} onChange={(event) => setPlannedStartDate(event.target.value)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="edit-planned-book-date" /></label>
          <label className="grid gap-2 text-sm font-medium">{t("overlays.planned.priority")}<select value={priority} onChange={(event) => setPriority(event.target.value)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="edit-planned-book-priority"><option value="">{t("overlays.planned.noPriority")}</option>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{t(`overlays.planned.priority${value}`)}</option>)}</select></label>
          {plannedEditError ? <p className="text-sm text-[var(--blab-color-error)]" role="alert" data-testid="edit-planned-book-error">{errorMessage(plannedEditError)}</p> : null}
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("overlays.cancel")} onClick={() => setOverlay(null)} /><ConsumerButton type="button" variant="primary" text={t("overlays.planned.save")} loading={plannedEditPending} loadingLabel={t("pending")} onClick={() => void savePlannedBook()} data-testid="edit-planned-book-save" /></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "book-completion"} onOpenChange={(open) => setOverlay(open ? "book-completion" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="book-completion"><DialogHeader><DialogTitle>{t("overlays.completion.title")}</DialogTitle><DialogDescription>{t("overlays.completion.description", { title: book.title })}</DialogDescription></DialogHeader><DialogFooter><ConsumerButton type="button" variant="secondary" text={t("overlays.completion.done")} onClick={() => setOverlay(null)} data-testid="book-completion-done" /><ConsumerButton type="button" variant="primary" text={t("overlays.completion.review")} onClick={() => setOverlay("book-review-prompt")} data-testid="book-completion-review" /></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={overlay === "book-review-prompt"} onOpenChange={(open) => setOverlay(open ? "book-review-prompt" : null)}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="book-review-prompt"><DialogHeader><DialogTitle>{t("overlays.reviewPrompt.title")}</DialogTitle><DialogDescription>{t("overlays.reviewPrompt.description")}</DialogDescription></DialogHeader><DialogFooter><ConsumerButton type="button" variant="secondary" text={t("overlays.reviewPrompt.later")} onClick={() => setOverlay(null)} data-testid="book-review-prompt-dismiss" /><Link href={`/${locale}/books/${book.id}/review`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white" data-testid="book-review-prompt-write">{t("overlays.reviewPrompt.write")}</Link></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={overlay === "review-link-editor"} onOpenChange={(open) => { setOverlay(open ? "review-link-editor" : null); setReviewLinkError(null); }}>
        <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="review-link-editor">
          <DialogHeader><DialogTitle>{t("review.linkEditor.title")}</DialogTitle><DialogDescription>{t("review.linkEditor.description")}</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium" htmlFor="review-link-editor-input">{t("review.linkEditor.label")}<input id="review-link-editor-input" type="url" value={reviewLinkDraft} onChange={(event) => setReviewLinkDraft(event.target.value)} placeholder="https://example.com/review" className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="review-link-editor-input" /></label>
          {reviewLinkError ? <p className="text-sm text-[var(--blab-color-error)]" role="alert" data-testid="review-link-editor-error">{errorMessage(reviewLinkError)}</p> : null}
          <DialogFooter><ConsumerButton type="button" variant="secondary" text={t("review.linkEditor.cancel")} onClick={() => setOverlay(null)} data-testid="review-link-editor-cancel" />{book.reviewLink ? <ConsumerButton type="button" variant="destructive" text={t("review.linkEditor.delete")} loading={reviewLinkPending} loadingLabel={t("pending")} onClick={() => void saveReviewLink(null)} data-testid="review-link-editor-delete" /> : null}<ConsumerButton type="button" variant="primary" text={t("review.linkEditor.save")} loading={reviewLinkPending} loadingLabel={t("pending")} onClick={() => void saveReviewLink(reviewLinkDraft.trim() || null)} data-testid="review-link-editor-save" /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
