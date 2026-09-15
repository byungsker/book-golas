"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConsumerButton } from "@/components/consumer/blab-primitives";
import { formatBookDate } from "@/lib/consumer/types";
import {
  BookIdSchema,
  ProgressUiResponseSchema,
  type ProgressEvent,
  type ProgressUiRequest,
} from "@/lib/product/contracts";

type ProgressStatus = "planned" | "reading" | "completed" | "will_retry" | "unknown";

type ProgressBook = {
  id: string;
  currentPage: number;
  totalPages: number;
  status: ProgressStatus;
  attemptCount: number;
};

type ProgressUpdaterProps = {
  locale: "ko" | "en";
  bookId: string;
  currentPage: number;
  totalPages: number;
  status?: ProgressStatus;
  attemptCount?: number;
  initialBook?: Partial<ProgressBook> & Pick<ProgressBook, "id">;
  initialHistory?: ProgressEvent[];
  initialHistoryState?: "loading" | "ready" | "error";
};

type ProgressErrorCode =
  | "invalid_input"
  | "unauthenticated"
  | "not_found"
  | "conflict"
  | "history_unavailable"
  | "consent_required"
  | "quota_exceeded"
  | "offline"
  | "unavailable";

type RollbackState = {
  book: ProgressBook;
  page: string;
  expectedPage: number;
  history: ProgressEvent[];
};

const emptyHistory: ProgressEvent[] = [];

function toProgressBook(input: {
  id: string;
  currentPage: number;
  totalPages: number;
  status: ProgressStatus;
  attemptCount?: number;
}): ProgressBook {
  return {
    id: input.id,
    currentPage: input.currentPage,
    totalPages: input.totalPages,
    status: input.status,
    attemptCount: input.attemptCount ?? 1,
  };
}

function normalizeErrorCode(value: string): ProgressErrorCode {
  if (value === "unauthorized") return "unauthenticated";
  if (
    value === "invalid_input" ||
    value === "unauthenticated" ||
    value === "not_found" ||
    value === "conflict" ||
    value === "history_unavailable" ||
    value === "consent_required" ||
    value === "quota_exceeded" ||
    value === "offline" ||
    value === "unavailable"
  ) {
    return value;
  }
  return "unavailable";
}

function readResponseError(body: unknown): ProgressErrorCode | null {
  const parsed = ProgressUiResponseSchema.safeParse(body);
  if (!parsed.success || !("error" in parsed.data)) return null;
  return normalizeErrorCode(parsed.data.error.code);
}

export function ProgressUpdater({
  locale,
  bookId,
  currentPage,
  totalPages,
  status = "reading",
  attemptCount = 1,
  initialBook,
  initialHistory = emptyHistory,
  initialHistoryState = "ready",
}: ProgressUpdaterProps) {
  const t = useTranslations("consumer");
  const router = useRouter();
  const startingBook = toProgressBook({
    id: initialBook?.id ?? bookId,
    currentPage: initialBook?.currentPage ?? currentPage,
    totalPages: initialBook?.totalPages ?? totalPages,
    status: initialBook?.status ?? status,
    attemptCount: initialBook?.attemptCount ?? attemptCount,
  });
  const [book, setBook] = useState<ProgressBook>(startingBook);
  const [page, setPage] = useState(String(startingBook.currentPage));
  const [expectedPage, setExpectedPage] = useState(startingBook.currentPage);
  const [history, setHistory] = useState<ProgressEvent[]>(initialHistory);
  const [historyState, setHistoryState] = useState(initialHistoryState);
  const [errorCode, setErrorCode] = useState<ProgressErrorCode | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const lastRequest = useRef<ProgressUiRequest | null>(null);

  useEffect(() => {
    const nextBook = toProgressBook({
      id: initialBook?.id ?? bookId,
      currentPage: initialBook?.currentPage ?? currentPage,
      totalPages: initialBook?.totalPages ?? totalPages,
      status: initialBook?.status ?? status,
      attemptCount: initialBook?.attemptCount ?? attemptCount,
    });
    setBook(nextBook);
    setPage(String(nextBook.currentPage));
    setExpectedPage(nextBook.currentPage);
    setHistory(initialHistory);
    setHistoryState(initialHistoryState);
    setErrorCode(null);
    setSaved(false);
    setConflict(false);
  }, [
    attemptCount,
    bookId,
    currentPage,
    initialBook?.attemptCount,
    initialBook?.currentPage,
    initialBook?.id,
    initialBook?.status,
    initialBook?.totalPages,
    initialHistory,
    initialHistoryState,
    status,
    totalPages,
  ]);

  function restore(rollback: RollbackState) {
    setBook(rollback.book);
    setPage(rollback.page);
    setExpectedPage(rollback.expectedPage);
    setHistory(rollback.history);
  }

  async function send(request: ProgressUiRequest) {
    const rollback: RollbackState = {
      book,
      page,
      expectedPage,
      history,
    };
    setIsSubmitting(true);
    setSaved(false);
    setErrorCode(null);
    setConflict(false);
    setBook((previous) => ({ ...previous, currentPage: request.currentPage }));

    try {
      const response = await fetch("/api/consumer/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      const responseError = readResponseError(body);
      if (!response.ok || responseError) {
        const code = responseError ?? (response.status === 409 ? "conflict" : "unavailable");
        throw new Error(code);
      }

      const parsed = ProgressUiResponseSchema.safeParse(body);
      if (!parsed.success || "error" in parsed.data) throw new Error("unavailable");

      const nextBook = toProgressBook(parsed.data.book);
      setBook(nextBook);
      setPage(String(nextBook.currentPage));
      setExpectedPage(nextBook.currentPage);
      setHistory(parsed.data.history);
      setHistoryState("ready");
      setSaved(true);
      setErrorCode(null);
      setConflict(false);
      lastRequest.current = null;
      window.dispatchEvent(
        new CustomEvent("bookgolas:progress-updated", { detail: parsed.data.book }),
      );
    } catch (error) {
      restore(rollback);
      const code = normalizeErrorCode(error instanceof Error ? error.message : "offline");
      setErrorCode(code);
      setConflict(code === "conflict");
    } finally {
      setIsSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setSaved(false);
    setErrorCode(null);
    setConflict(false);
    const nextPage = Number(page);
    if (!Number.isSafeInteger(nextPage) || nextPage < 0 || nextPage > book.totalPages) {
      setErrorCode("invalid_input");
      return;
    }

    const request: ProgressUiRequest = {
      locale,
      bookId: BookIdSchema.parse(bookId),
      currentPage: nextPage,
      expectedCurrentPage: expectedPage,
      idempotencyKey: crypto.randomUUID(),
      readingTime: 0,
    };
    lastRequest.current = request;
    void send(request);
  }

  function retry() {
    if (!lastRequest.current || isSubmitting) return;
    void send(lastRequest.current);
  }

  function refetch() {
    setConflict(false);
    setErrorCode(null);
    router.refresh();
  }

  const errorMessage = errorCode
    ? t(`reading.errors.${errorCode}` as never)
    : null;
  const progress = book.totalPages > 0
    ? Math.min(100, Math.max(0, (book.currentPage / book.totalPages) * 100))
    : 0;
  const historyLoading = historyState === "loading";
  const historyError = historyState === "error";

  return (
    <div
      data-testid="progress-live"
      data-progress-status={book.status}
      data-progress-history-state={historyLoading ? "loading" : historyError ? "error" : "ready"}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3" data-testid="progress-summary">
        <div>
          <p className="text-sm font-medium text-white/70">{t("reading.progressSummary")}</p>
          <p className="mt-1 text-lg font-semibold text-white" data-testid="progress-current-page">
            {book.currentPage} / {book.totalPages} {t("book.pages")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-indigo-200" data-testid="progress-status">
            {t(`book.status.${book.status}` as never)}
          </p>
          <p className="mt-1 text-xs text-white/50" data-testid="progress-percent">
            {Math.round(progress)}%
          </p>
        </div>
      </div>

      <div
        className="mb-5 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={t("book.progressLabel")}
        aria-valuemin={0}
        aria-valuemax={book.totalPages || 1}
        aria-valuenow={book.currentPage}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-300" style={{ width: `${progress}%` }} />
      </div>

      <form
        onSubmit={submit}
        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
        aria-busy={isSubmitting}
        noValidate
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-44 flex-1">
            <label
              htmlFor={`current-page-${bookId}`}
              className="mb-2 block text-sm font-medium text-white/80"
            >
              {t("reading.currentPage")}
            </label>
            <input
              id={`current-page-${bookId}`}
              name="currentPage"
              type="number"
              inputMode="numeric"
              min={0}
              max={book.totalPages}
              value={page}
              onChange={(event) => setPage(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-base text-white outline-none transition placeholder:text-white/35 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300/40"
              aria-describedby={errorMessage ? `progress-error-${bookId}` : undefined}
              data-testid="progress-page-input"
              required
            />
          </div>
          <span className="pb-2 text-sm text-white/55">/ {book.totalPages}</span>
          <ConsumerButton
            type="submit"
            disabled={isSubmitting || book.totalPages < 0}
            loading={isSubmitting}
            loadingLabel={t("reading.saving")}
            data-testid="progress-submit"
          >
            {t("reading.save")}
          </ConsumerButton>
        </div>

        {errorMessage ? (
          <div
            id={`progress-error-${bookId}`}
            className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100"
            data-testid="progress-error"
            role="alert"
          >
            <p>{errorMessage}</p>
            {conflict ? (
              <ConsumerButton
                className="mt-3"
                type="button"
                variant="secondary"
                text={t("reading.refetch")}
                onClick={refetch}
                data-testid="progress-refetch"
              />
            ) : lastRequest.current ? (
              <ConsumerButton
                className="mt-3"
                type="button"
                variant="secondary"
                text={t("reading.retry")}
                onClick={retry}
                data-testid="progress-retry"
              />
            ) : null}
          </div>
        ) : null}
        {saved ? (
          <p className="mt-4 text-sm text-emerald-200" data-testid="progress-saved" role="status">
            {t("reading.saved")}
          </p>
        ) : null}
        {book.status === "completed" ? (
          <p className="mt-4 text-sm text-emerald-200" data-testid="progress-completed" role="status">
            {t("reading.completed")}
          </p>
        ) : null}
        {book.attemptCount > 1 ? (
          <p className="mt-4 text-sm text-amber-200" data-testid="progress-attempt-message">
            {t("reading.attempt", { count: book.attemptCount })}
          </p>
        ) : null}
      </form>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5" data-testid="progress-history-section">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">{t("reading.historyTitle")}</h3>
          <span className="text-xs text-white/50" data-testid="progress-history-count">{history.length}</span>
        </div>
        {historyLoading ? (
          <p className="mt-4 text-sm text-white/60" data-testid="progress-history-loading" aria-busy="true">
            {t("reading.historyLoading")}
          </p>
        ) : historyError ? (
          <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100" role="alert" data-testid="progress-history-error">
            <p>{t("reading.errors.history_unavailable")}</p>
            <ConsumerButton
              className="mt-3"
              type="button"
              variant="secondary"
              text={t("reading.refetch")}
              onClick={refetch}
              data-testid="progress-history-refetch"
            />
          </div>
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-white/60" data-testid="progress-history-empty">
            {t("reading.historyEmpty")}
          </p>
        ) : (
          <ol className="mt-4 space-y-3" data-testid="progress-history">
            {history.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm"
                data-testid={`progress-history-${event.id}`}
              >
                <span className="font-medium text-white/85">
                  {t("reading.historyEntry", { from: event.previousPage, to: event.page })}
                </span>
                <time className="shrink-0 text-xs text-white/50" dateTime={event.createdAt}>
                  {formatBookDate(event.createdAt, locale)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
