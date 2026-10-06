"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProgressForm } from "./ProgressForm";
import { ProgressHistory } from "./ProgressHistory";
import { ReadingGoalControls } from "./ReadingGoalControls";
import {
  ProgressUiResponseSchema,
  type ProgressUiRequest,
} from "../api/progress-ui-contracts";
import { BookIdSchema } from "@/shared/api/contracts";
import type { Book, ProgressEvent } from "@/shared/api/contracts";

type ProgressUpdaterProps = {
  readonly locale: "ko" | "en";
  readonly bookId: string;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly status?: Book["status"];
  readonly attemptCount?: number;
  readonly initialBook: Book;
  readonly initialHistory?: readonly ProgressEvent[];
  readonly initialHistoryState?: "loading" | "ready" | "error";
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
  readonly book: Book;
  readonly page: string;
  readonly expectedPage: number;
  readonly history: readonly ProgressEvent[];
};

const emptyHistory: readonly ProgressEvent[] = [];

function normalizeErrorCode(value: string): ProgressErrorCode {
  if (value === "unauthorized") return "unauthenticated";
  if (value === "invalid_input" || value === "unauthenticated" || value === "not_found" || value === "conflict" || value === "history_unavailable" || value === "consent_required" || value === "quota_exceeded" || value === "offline" || value === "unavailable") return value;
  return "unavailable";
}

export function ProgressUpdater({
  locale,
  bookId,
  initialBook,
  initialHistory = emptyHistory,
  initialHistoryState = "ready",
}: ProgressUpdaterProps) {
  const t = useTranslations("consumer");
  const router = useRouter();
  const [book, setBook] = useState(initialBook);
  const [page, setPage] = useState(String(initialBook.currentPage));
  const [expectedPage, setExpectedPage] = useState(initialBook.currentPage);
  const [history, setHistory] = useState<readonly ProgressEvent[]>(initialHistory);
  const [historyState, setHistoryState] = useState(initialHistoryState);
  const [errorCode, setErrorCode] = useState<ProgressErrorCode | null>(null);
  const [saved, setSaved] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastRequest = useRef<ProgressUiRequest | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setBook(initialBook);
      setPage(String(initialBook.currentPage));
      setExpectedPage(initialBook.currentPage);
      setHistory(initialHistory);
      setHistoryState(initialHistoryState);
      setErrorCode(null);
      setSaved(false);
      lastRequest.current = null;
      setCanRetry(false);
    });
    return () => {
      active = false;
    };
  }, [initialBook, initialHistory, initialHistoryState]);

  function restore(rollback: RollbackState): void {
    setBook(rollback.book);
    setPage(rollback.page);
    setExpectedPage(rollback.expectedPage);
    setHistory(rollback.history);
  }

  async function send(request: ProgressUiRequest): Promise<void> {
    lastRequest.current = request;
    setCanRetry(true);
    if (!navigator.onLine) {
      setErrorCode("offline");
      return;
    }
    const rollback: RollbackState = { book, page, expectedPage, history };
    setIsSubmitting(true);
    setSaved(false);
    setErrorCode(null);
    setBook((previous) => ({ ...previous, currentPage: request.currentPage }));

    try {
      const revision = String(request.expectedCurrentPage);
      const response = await fetch("/api/consumer/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${revision}"`,
          "X-Bookgolas-Action-Key": `${request.bookId}:progress:${revision}:${request.idempotencyKey}`,
        },
        body: JSON.stringify(request),
        cache: "no-store",
      });
      const parsed = ProgressUiResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        restore(rollback);
        setErrorCode(response.status === 409 ? "conflict" : "unavailable");
        return;
      }
      if ("error" in parsed.data) {
        restore(rollback);
        setErrorCode(normalizeErrorCode(parsed.data.error.code));
        return;
      }
      if (!response.ok) {
        restore(rollback);
        setErrorCode(response.status === 409 ? "conflict" : "unavailable");
        return;
      }
      if (parsed.data.kind !== "updated") {
        restore(rollback);
        setErrorCode("unavailable");
        return;
      }
      const updated = parsed.data;

      setBook((previous) => ({
        ...previous,
        currentPage: updated.book.currentPage,
        totalPages: updated.book.totalPages,
        status: updated.book.status === "unknown" ? previous.status : updated.book.status,
        updatedAt: updated.book.updatedAt,
      }));
      setPage(String(updated.book.currentPage));
      setExpectedPage(updated.book.currentPage);
      setHistory(updated.history);
      setHistoryState("ready");
      setSaved(true);
      setErrorCode(null);
      lastRequest.current = null;
      setCanRetry(false);
      window.dispatchEvent(new CustomEvent("bookgolas:progress-updated", { detail: updated.book }));
    } catch (error) {
      restore(rollback);
      if (error instanceof TypeError || error instanceof SyntaxError) {
        setErrorCode(error instanceof TypeError ? "offline" : "unavailable");
        return;
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isSubmitting) return;
    setSaved(false);
    setErrorCode(null);
    const nextPage = Number(page);
    if (!Number.isSafeInteger(nextPage) || nextPage < 0 || nextPage > book.totalPages) {
      setErrorCode("invalid_input");
      return;
    }
    void send({
      locale,
      bookId: BookIdSchema.parse(bookId),
      currentPage: nextPage,
      expectedCurrentPage: expectedPage,
      idempotencyKey: crypto.randomUUID(),
      readingTime: 0,
    });
  }

  function retry(): void {
    if (lastRequest.current && !isSubmitting) void send(lastRequest.current);
  }

  function refetch(): void {
    setErrorCode(null);
    router.refresh();
  }

  const errorMessage = errorCode ? t(`reading.errors.${errorCode}`) : null;
  const statusLabel = t(`book.status.${book.status}`);

  return (
    <div data-testid="progress-live" data-progress-status={book.status} data-progress-history-state={historyState}>
      <ProgressForm
        bookId={bookId}
        currentPage={book.currentPage}
        totalPages={book.totalPages}
        page={page}
        statusLabel={statusLabel}
        pagesLabel={t("book.pages")}
        progressLabel={t("reading.progressSummary")}
        currentPageLabel={t("reading.currentPage")}
        saveLabel={t("reading.save")}
        savingLabel={t("reading.saving")}
        savedLabel={t("reading.saved")}
        completedLabel={t("reading.completed")}
        attemptLabel={book.attemptCount > 1 ? t("reading.attempt", { count: book.attemptCount }) : null}
        errorMessage={errorMessage}
        conflict={errorCode === "conflict"}
        isSubmitting={isSubmitting}
        saved={saved}
        completed={book.status === "completed"}
        canRetry={canRetry}
        retryLabel={t("reading.retry")}
        refetchLabel={t("reading.refetch")}
        onPageChange={setPage}
        onSubmit={submit}
        onRetry={retry}
        onRefetch={refetch}
      />
      <ReadingGoalControls locale={locale} book={book} onBookUpdated={setBook} />
      <ProgressHistory history={history} state={historyState} locale={locale} onRefetch={refetch} />
    </div>
  );
}
