import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookCard } from "@/components/consumer/book-card";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import { NetworkStatus } from "@/components/consumer/network-status";
import { RefreshButton } from "@/components/consumer/refresh-button";
import { getConsumerPath, isConsumerLocale } from "@/lib/consumer/paths";
import { fetchOwnedBooks, getCurrentConsumerUser } from "@/lib/consumer/queries";
import { isConsumerBookStatus } from "@/lib/consumer/types";

export const dynamic = "force-dynamic";

export default async function ConsumerHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const { user, unavailable: authUnavailable } = await getCurrentConsumerUser();
  if (!user && !authUnavailable) {
    redirect(
      `${getConsumerPath(locale, "/auth/sign-in")}?next=${encodeURIComponent(getConsumerPath(locale, "/home"))}`,
    );
  }

  const t = await getTranslations("consumer");
  const result = user ? await fetchOwnedBooks() : { books: [], code: "unavailable" as const };

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white">
      <ConsumerHeader locale={locale} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">{t("home.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("home.title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
              {t("home.description")}
            </p>
          </div>
          <RefreshButton />
        </div>

        <div className="mt-6">
          <NetworkStatus />
        </div>

        <section className="mt-8" aria-labelledby="consumer-books-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="consumer-books-heading" className="text-lg font-semibold text-white">
              {t("home.booksHeading")}
            </h2>
            <span className="text-sm text-white/50">
              {t("home.bookCount", { count: result.books.length })}
            </span>
          </div>

          {authUnavailable || result.code === "unavailable" ? (
            <ConsumerNotice
              title={t("states.errorTitle")}
              description={t("states.errorDescription")}
              action={<RefreshButton />}
            />
          ) : result.books.length === 0 ? (
            <ConsumerNotice
              title={t("home.emptyTitle")}
              description={t("home.emptyDescription")}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {result.books.map((book) => {
                const statusKey = isConsumerBookStatus(book.status)
                  ? book.status
                  : "unknown";

                return (
                  <BookCard
                    key={book.id}
                    book={book}
                    locale={locale}
                    statusLabel={
                      {
                        planned: t("book.status.planned"),
                        reading: t("book.status.reading"),
                        completed: t("book.status.completed"),
                        will_retry: t("book.status.will_retry"),
                        unknown: t("book.status.unknown"),
                      }[statusKey]
                    }
                    openLabel={t("home.openBook")}
                    progressLabel={t("book.progressLabel")}
                    authorUnknownLabel={t("book.authorUnknown")}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
