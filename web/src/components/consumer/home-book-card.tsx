import Link from "next/link";
import { getConsumerPath, type ConsumerLocale } from "@/lib/consumer/paths";
import {
  formatBookDate,
  getBookProgress,
  type ConsumerBook,
} from "@/lib/consumer/types";
import { getDaysUntilTarget, getEffectiveBookStatus } from "@/lib/consumer/home-book-list";

type HomeBookCardProps = {
  book: ConsumerBook;
  locale: ConsumerLocale;
  statusLabel: string;
  openLabel: string;
  progressLabel: string;
  authorUnknownLabel: string;
  pagesLabel: string;
  targetLabel: string;
  startedLabel: string;
  plannedStartLabel: string;
  ddayLabel: string;
};

export function HomeBookCard({
  book,
  locale,
  statusLabel,
  openLabel,
  progressLabel,
  authorUnknownLabel,
  pagesLabel,
  targetLabel,
  startedLabel,
  plannedStartLabel,
  ddayLabel,
}: HomeBookCardProps) {
  const progress = getBookProgress(book);
  const effectiveStatus = getEffectiveBookStatus(book);
  const startDate = effectiveStatus === "planned" ? book.plannedStartDate ?? book.startDate : book.startDate;
  const startDateLabel = effectiveStatus === "planned" ? plannedStartLabel : startedLabel;
  const startDateValue = formatBookDate(startDate, locale);
  const targetDateValue = formatBookDate(book.targetDate, locale);
  const daysUntilTarget = getDaysUntilTarget(book.targetDate);

  return (
    <article
      className="rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 shadow-[var(--blab-elevation-subtle)] transition hover:-translate-y-0.5 hover:border-[var(--blab-color-primary)]/40"
      data-book-status={effectiveStatus}
      data-testid={`home-book-card-${book.id}`}
    >
      <div className="flex gap-4">
        <div
          aria-hidden="true"
          className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] text-2xl shadow-inner"
        >
          📖
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-[var(--blab-text-primary)]">{book.title}</h3>
              <p className="mt-1 truncate text-sm text-[var(--blab-text-tertiary)]">
                {book.author || authorUnknownLabel}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--blab-color-primary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--blab-color-primary)]">
              {statusLabel}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--blab-text-tertiary)]">
            <span>{startDateLabel}: {startDateValue}</span>
            <span>{targetLabel}: {targetDateValue}</span>
            {daysUntilTarget === null ? null : <span data-testid="book-dday">{ddayLabel}</span>}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--blab-text-tertiary)]">
          <span>{progressLabel}</span>
          <span>{book.currentPage} / {book.totalPages} {pagesLabel}</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--blab-glass-fill)]"
          role="progressbar"
          aria-label={progressLabel}
          aria-valuemin={0}
          aria-valuemax={book.totalPages || 1}
          aria-valuenow={book.currentPage}
        >
          <div
            className="h-full rounded-full bg-[var(--blab-color-primary)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Link
        href={getConsumerPath(locale, `/books/${book.id}`)}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-medium text-[var(--blab-text-primary)] transition hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
      >
        {openLabel}
      </Link>
    </article>
  );
}
