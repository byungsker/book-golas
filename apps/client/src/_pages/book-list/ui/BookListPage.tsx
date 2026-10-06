import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsumerHeader } from "@/widgets/consumer-header";
import { getDaysUntilTarget, getEffectiveBookStatus } from "@/entities/book";
import {
  HomeBookCard,
  getHomeBookListStatus,
  getHomeBookListView,
  selectHomeBookListBooks,
  type HomeBookListView,
} from "@/widgets/home-book-list";
import {
  getConsumerPath,
  getConsumerSignInRedirectPath,
  isConsumerLocale,
} from "@/shared/routing";
import { fetchOwnedBooks } from "@/widgets/home-book-list/index.server";
import { getCurrentConsumerUser } from "@/shared/auth/index.server";

export type BookListPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
};

export default async function BookListPage({
  params,
  searchParams,
}: BookListPageProps) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const { user, unavailable: authUnavailable } = await getCurrentConsumerUser();
  if (!user && !authUnavailable) {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/book-list")));
  }

  const t = await getTranslations("consumer");
  const result = user ? await fetchOwnedBooks() : { books: [], code: "unavailable" as const };
  const rawView = (await searchParams)?.view;
  const view = getHomeBookListView(Array.isArray(rawView) ? rawView[0] : rawView);
  const books = selectHomeBookListBooks(result.books, view);
  const selectedStatus = getHomeBookListStatus(view);
  const tabs: { view: HomeBookListView; label: string }[] = [
    { view: "reading", label: t("home.statusTabs.reading") },
    { view: "planned", label: t("home.statusTabs.planned") },
    { view: "completed", label: t("home.statusTabs.completed") },
    { view: "will_retry", label: t("home.statusTabs.willRetry") },
    { view: "all", label: t("home.statusTabs.all") },
  ];
  const statusLabel = (book: (typeof result.books)[number]) => t(`book.status.${getEffectiveBookStatus(book)}`);
  const ddayLabel = (book: (typeof result.books)[number]) => {
    const days = getDaysUntilTarget(book.targetDate);
    if (days === null) return t("home.dday.unknown");
    if (days > 0) return t("home.dday.before", { days });
    if (days < 0) return t("home.dday.overdue", { days: Math.abs(days) });
    return t("home.dday.today");
  };

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-testid="legacy-book-list" data-route-state={authUnavailable || result.code === "unavailable" ? "error" : "ready"}>
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("home.eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.booksHeading")}</h1></div>
          <Link href={getConsumerPath(locale, "/books/new")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">{t("home.addBook")}</Link>
        </div>
        <nav aria-label={t("home.statusTabs.label")} data-testid="legacy-book-list-tabs" className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-2 sm:grid-cols-5">
          {tabs.map((tab) => <Link key={tab.view} href={getConsumerPath(locale, `/book-list?view=${tab.view}`)} aria-current={tab.view === view ? "page" : undefined} data-testid={`legacy-book-list-tab-${tab.view}`} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${tab.view === view ? "bg-[var(--blab-color-primary)] text-white" : "text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`}>{tab.label}</Link>)}
        </nav>
        {authUnavailable || result.code === "unavailable" ? <p className="mt-8" data-testid="legacy-book-list-error">{t("states.errorDescription")}</p> : books.length === 0 ? <div className="mt-8" data-testid={`legacy-book-list-empty-${view}`}>{selectedStatus ? t(`home.statusEmpty.${view}.title`) : t("home.emptyTitle")}</div> : <div className="mt-8 grid gap-4 md:grid-cols-2" data-testid={`legacy-book-list-view-${view}`}>{books.map((book) => <HomeBookCard key={book.id} book={book} locale={locale} href={getConsumerPath(locale, `/books/${book.id}`)} statusLabel={statusLabel(book)} ddayLabel={ddayLabel(book)} openLabel={t("home.openBook")} progressLabel={t("book.progressLabel")} authorUnknownLabel={t("book.authorUnknown")} pagesLabel={t("book.pages")} targetLabel={t("book.targetDate")} startedLabel={t("book.startDate")} plannedStartLabel={t("home.plannedStart")} />)}</div>}
      </main>
    </div>
  );
}
