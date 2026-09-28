import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchOwnedBooks } from "@/lib/consumer/queries";
import type { AppLocale } from "@/shared/config";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale } from "@/shared/routing";
import { RefreshButton } from "@/shared/ui";
import { getHomeBookListView } from "../model/home-book-filter";
import { HomeBookList } from "./HomeBookList";

type ConsumerHomePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
};

export async function ConsumerHomePage({
  params,
  searchParams,
}: ConsumerHomePageProps) {
  const { locale: rawLocale } = await params;
  if (!isConsumerLocale(rawLocale)) redirect("/ko/auth/sign-in");

  const locale: AppLocale = rawLocale;
  const result = await fetchOwnedBooks();
  if (result.code === "unauthenticated") {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/home")));
  }

  const rawView = (await searchParams)?.view;
  const requestedView = Array.isArray(rawView) ? rawView[0] : rawView;
  const t = await getTranslations("consumer");
  const view = getHomeBookListView(requestedView);
  const unavailable = result.code === "unavailable";

  return (
    <div
      className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]"
      data-route-state={unavailable ? "error" : "ready"}
      data-testid="home-book-list"
    >
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

        <HomeBookList locale={locale} books={result.books} unavailable={unavailable} view={view} />
      </main>
    </div>
  );
}
