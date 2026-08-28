import Link from "next/link";
import { getConsumerPath, type ConsumerLocale } from "@/lib/consumer/paths";
import { getBookProgress, type ConsumerBook } from "@/lib/consumer/types";

type BookCardProps = {
  book: ConsumerBook;
  locale: ConsumerLocale;
  statusLabel: string;
  openLabel: string;
  progressLabel: string;
  authorUnknownLabel: string;
};

export function BookCard({
  book,
  locale,
  statusLabel,
  openLabel,
  progressLabel,
  authorUnknownLabel,
}: BookCardProps) {
  const progress = getBookProgress(book);

  return (
    <article className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-indigo-300/30 hover:bg-white/[0.06]">
      <div className="flex gap-4">
        <div
          aria-hidden="true"
          className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-300/30 to-sky-300/10 text-2xl shadow-inner shadow-white/10"
        >
          📖
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{book.title}</h2>
              <p className="mt-1 truncate text-sm text-white/55">
                {book.author || authorUnknownLabel}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-300/15 px-2.5 py-1 text-xs font-medium text-indigo-100">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/55">
          <span>{progressLabel}</span>
          <span>
            {book.currentPage} / {book.totalPages}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={progressLabel}
          aria-valuemin={0}
          aria-valuemax={book.totalPages || 1}
          aria-valuenow={book.currentPage}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-300 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Link
        href={getConsumerPath(locale, `/books/${book.id}`)}
        className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        {openLabel}
      </Link>
    </article>
  );
}
