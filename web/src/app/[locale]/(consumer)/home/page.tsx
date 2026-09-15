import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { HomeBookCard } from "@/components/consumer/home-book-card";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import { NetworkStatus } from "@/components/consumer/network-status";
import { RefreshButton } from "@/components/consumer/refresh-button";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale } from "@/lib/consumer/paths";
import {
  getDaysUntilTarget,
  getEffectiveBookStatus,
  getHomeBookListStatus,
  getHomeBookListView,
  selectHomeBookListBooks,
  type HomeBookListView,
} from "@/lib/consumer/home-book-list";
import { fetchOwnedBooks, getCurrentConsumerUser } from "@/lib/consumer/queries";

export const dynamic = "force-dynamic";

export default async function ConsumerHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const { user, unavailable: authUnavailable } = await getCurrentConsumerUser();
  if (!user && !authUnavailable) {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/home")));
  }

  const t = await getTranslations("consumer");
  const result = user ? await fetchOwnedBooks() : { books: [], code: "unavailable" as const };
  const rawView = (await searchParams)?.view;
  const view = getHomeBookListView(Array.isArray(rawView) ? rawView[0] : rawView);
  const visibleBooks = selectHomeBookListBooks(result.books, view);
  const currentReadingBooks = selectHomeBookListBooks(result.books, "reading");
  const selectedStatus = getHomeBookListStatus(view);
  const statusTabs: { view: HomeBookListView; label: string }[] = [
    { view: "reading", label: t("home.statusTabs.reading") },
    { view: "planned", label: t("home.statusTabs.planned") },
    { view: "completed", label: t("home.statusTabs.completed") },
    { view: "paused", label: t("home.statusTabs.paused") },
    { view: "all", label: t("home.statusTabs.all") },
  ];
  const statusLabel = (book: (typeof result.books)[number]) => {
    const status = getEffectiveBookStatus(book);
    return {
      planned: t("book.status.planned"),
      reading: t("book.status.reading"),
      completed: t("book.status.completed"),
      will_retry: t("book.status.will_retry"),
      unknown: t("book.status.unknown"),
    }[status] ?? t("book.status.unknown");
  };
  const getDdayLabel = (book: (typeof result.books)[number]) => {
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
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-route-state={authUnavailable || result.code === "unavailable" ? "error" : "ready"} data-testid="home-book-list">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("home.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("home.title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--blab-text-tertiary)]">
              {t("home.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <RefreshButton />
            <Link
              href={getConsumerPath(locale, "/books/new")}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
            >
              {t("home.addBook")}
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <NetworkStatus />
        </div>

        <section className="mt-8" aria-labelledby="consumer-books-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="consumer-books-heading" className="text-lg font-semibold text-[var(--blab-text-primary)]">
              {view === "reading" ? t("home.currentReading") : t("home.booksHeading")}
            </h2>
            <span className="text-sm text-[var(--blab-text-tertiary)]">
              {t("home.bookCount", { count: result.books.length })}
            </span>
          </div>

          <nav
            aria-label={t("home.statusTabs.label")}
            className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-2 sm:grid-cols-5"
            data-testid="home-status-tabs"
          >
            {statusTabs.map((tab) => (
              <Link
                key={tab.view}
                href={getConsumerPath(locale, `/home?view=${tab.view}`)}
                aria-current={tab.view === view ? "page" : undefined}
                data-testid={`home-status-tab-${tab.view}`}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${tab.view === view ? "bg-[var(--blab-color-primary)] text-white" : "text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {authUnavailable || result.code === "unavailable" ? (
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
                      <HomeBookCard key={`current-${book.id}`} book={book} statusLabel={statusLabel(book)} ddayLabel={getDdayLabel(book)} {...cardProps} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="selected-book-list-heading">
                <h3 id="selected-book-list-heading" className="sr-only">{selectedStatus ? statusTabs.find((tab) => tab.view === view)?.label : t("home.booksHeading")}</h3>
                <div className="grid gap-4 md:grid-cols-2" data-testid={`home-book-list-view-${view}`}>
                  {visibleBooks.map((book) => (
                    <HomeBookCard key={book.id} book={book} statusLabel={statusLabel(book)} ddayLabel={getDdayLabel(book)} {...cardProps} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
