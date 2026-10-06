import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDaysUntilTarget, getEffectiveBookStatus, type ConsumerBook } from "@/entities/book";
import { getHomeBookListStatus, selectHomeBookListBooks, type HomeBookListView } from "../model/home-book-filter";
import { getConsumerPath } from "@/shared/routing";
import { ConsumerNotice, RefreshButton } from "@/shared/ui";
import type { AppLocale } from "@/shared/config";
import { HomeBookCard } from "./HomeBookCard";
import { HomeBookFilter } from "./HomeBookFilter";

type HomeBookListProps = {
  locale: AppLocale;
  books: readonly ConsumerBook[];
  unavailable: boolean;
  view: HomeBookListView;
};

export async function HomeBookList({ locale, books, unavailable, view }: HomeBookListProps) {
  const t = await getTranslations("consumer");
  const visibleBooks = selectHomeBookListBooks(books, view);
  const currentReadingBooks = selectHomeBookListBooks(books, "reading");
  const selectedStatus = getHomeBookListStatus(view);
  const filterLabels = {
    reading: t("home.statusTabs.reading"),
    planned: t("home.statusTabs.planned"),
    completed: t("home.statusTabs.completed"),
    paused: t("home.statusTabs.paused"),
    all: t("home.statusTabs.all"),
  };
  const statusLabel = (book: ConsumerBook) => {
    const status = getEffectiveBookStatus(book);
    return {
      planned: t("book.status.planned"),
      reading: t("book.status.reading"),
      completed: t("book.status.completed"),
      will_retry: t("book.status.will_retry"),
      unknown: t("book.status.unknown"),
    }[status] ?? t("book.status.unknown");
  };
  const getDdayLabel = (book: ConsumerBook) => {
    const days = getDaysUntilTarget(book.targetDate);
    if (days === null) return t("home.dday.unknown");
    if (days > 0) return t("home.dday.before", { days });
    if (days < 0) return t("home.dday.overdue", { days: Math.abs(days) });
    return t("home.dday.today");
  };
  const cardProps = {
    locale,
    openLabel: t("home.openBook"),
    progressLabel: t("book.progressLabel"),
    authorUnknownLabel: t("book.authorUnknown"),
    pagesLabel: t("book.pages"),
    targetLabel: t("book.targetDate"),
    startedLabel: t("book.startDate"),
    plannedStartLabel: t("home.plannedStart"),
  };

  return (
    <section className="mt-8" aria-labelledby="consumer-books-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="consumer-books-heading" className="text-lg font-semibold text-[var(--blab-text-primary)]">
          {view === "reading" ? t("home.currentReading") : t("home.booksHeading")}
        </h2>
        <span className="text-sm text-[var(--blab-text-tertiary)]">
          {t("home.bookCount", { count: books.length })}
        </span>
      </div>

      <HomeBookFilter
        locale={locale}
        view={view}
        labels={filterLabels}
        ariaLabel={t("home.statusTabs.label")}
      />

      {unavailable ? (
        <ConsumerNotice
          title={t("states.errorTitle")}
          description={t("states.errorDescription")}
          tone="error"
          action={<RefreshButton />}
        />
      ) : visibleBooks.length === 0 ? (
        <div data-testid={`home-book-list-empty-${view}`}>
          <ConsumerNotice
            title={selectedStatus ? t(`home.statusEmpty.${view}.title`) : t("home.emptyTitle")}
            description={selectedStatus ? t(`home.statusEmpty.${view}.description`) : t("home.emptyDescription")}
            action={
              <Link
                href={getConsumerPath(locale, "/books/new")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
              >
                {t("home.addBook")}
              </Link>
            }
          />
        </div>
      ) : (
        <div>
          {view === "all" && currentReadingBooks.length > 0 ? (
            <section className="mb-8" aria-labelledby="current-reading-heading" data-testid="current-reading-section">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 id="current-reading-heading" className="text-base font-semibold text-[var(--blab-text-primary)]">
                  {t("home.currentReading")}
                </h3>
                <span className="text-sm text-[var(--blab-text-tertiary)]">{currentReadingBooks.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {currentReadingBooks.map((book) => (
                  <HomeBookCard
                    key={`current-${book.id}`}
                    book={book}
                    href={getConsumerPath(locale, `/books/${book.id}`)}
                    statusLabel={statusLabel(book)}
                    ddayLabel={getDdayLabel(book)}
                    {...cardProps}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="selected-book-list-heading">
            <h3 className="sr-only" id="selected-book-list-heading">
              {selectedStatus ? filterLabels[view] : t("home.booksHeading")}
            </h3>
            <div className="grid gap-4 md:grid-cols-2" data-testid={`home-book-list-view-${view}`}>
              {visibleBooks.map((book) => (
                <HomeBookCard
                  key={book.id}
                  book={book}
                  href={getConsumerPath(locale, `/books/${book.id}`)}
                  statusLabel={statusLabel(book)}
                  ddayLabel={getDdayLabel(book)}
                  {...cardProps}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
