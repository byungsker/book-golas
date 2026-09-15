"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  ConsumerButton,
  ConsumerCard,
} from "@/components/consumer/blab-primitives";
import { ReadingTimerControl } from "@/components/consumer/reading-timer-control";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import { formatTimerDuration } from "@/lib/consumer/timer-state";
import { formatBookDate } from "@/lib/consumer/types";
import {
  BookDetailResponseSchema,
  canApplyBookDetailAction,
  type Book,
  type BookDetailAction,
} from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";

type BookDetailClientProps = {
  locale: ConsumerLocale;
  initialBook: Book;
};

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

export function BookDetailClient({ locale, initialBook }: BookDetailClientProps) {
  const t = useTranslations("consumer.bookDetail");
  const router = useRouter();
  const [book, setBook] = useState(initialBook);
  const [pendingAction, setPendingAction] = useState<BookDetailAction | null>(null);
  const [lastAction, setLastAction] = useState<BookDetailAction | null>(null);
  const [error, setError] = useState<ProductError | null>(null);
  const [successAction, setSuccessAction] = useState<BookDetailAction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

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
        headers: { "Content-Type": "application/json" },
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
        setDeleteDialogOpen(false);
      } else {
        setBook(parsed.data.book);
        setSuccessAction(action);
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
                className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
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
    <div data-testid="book-detail-live" data-book-status={status}>
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
              onClick={() => void executeAction(action)}
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
            onClick={() => setDeleteDialogOpen(true)}
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

        {book.review || book.longReview || reviewHref ? (
          <div className="mt-6 border-t border-[var(--blab-glass-border)] pt-5" data-testid="book-detail-review">
            <h3 className="text-base font-semibold text-[var(--blab-text-primary)]">{t("review.title")}</h3>
            {book.review ? <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{book.review}</p> : null}
            {book.longReview ? <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{book.longReview}</p> : null}
            {reviewHref ? <a className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)] underline-offset-4 hover:underline" href={reviewHref} target="_blank" rel="noreferrer" data-testid="book-detail-review-link">{t("review.open")}<ExternalLink aria-hidden="true" size={15} /></a> : null}
          </div>
        ) : null}

        {storeHref ? <a className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)] underline-offset-4 hover:underline" href={storeHref} target="_blank" rel="noreferrer" data-testid="book-detail-store-link">{t("links.store")}<ExternalLink aria-hidden="true" size={15} /></a> : null}
      </ConsumerCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="book-detail-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <ConsumerButton type="button" variant="secondary" text={t("delete.cancel")} data-testid="book-detail-delete-cancel" />
            </DialogClose>
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
    </div>
  );
}
