import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import { NetworkStatus } from "@/components/consumer/network-status";
import { ProgressUpdater } from "@/components/consumer/progress-updater";
import { getConsumerPath, isConsumerLocale } from "@/lib/consumer/paths";
import { fetchOwnedBook } from "@/lib/consumer/queries";

export const dynamic = "force-dynamic";

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { locale, bookId } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const result = await fetchOwnedBook(bookId);
  if (result.code === "unauthenticated") {
    redirect(
      `${getConsumerPath(locale, "/auth/sign-in")}?next=${encodeURIComponent(getConsumerPath(locale, `/reading/${bookId}`))}`,
    );
  }

  const t = await getTranslations("consumer");
  if (result.code !== "ok" || !result.book) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] text-white">
        <ConsumerHeader locale={locale} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
          <ConsumerNotice
            title={
              result.code === "unavailable"
                ? t("states.errorTitle")
                : t("states.permissionTitle")
            }
            description={
              result.code === "unavailable"
                ? t("states.errorDescription")
                : t("states.permissionDescription")
            }
            action={
              <Link
                href={getConsumerPath(locale, "/home")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-400 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                {t("book.backHome")}
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const { book } = result;

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white">
      <ConsumerHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <Link
          href={getConsumerPath(locale, `/books/${book.id}`)}
          className="inline-flex rounded-md text-sm text-white/60 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          {t("reading.backToBook")}
        </Link>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-sm font-medium text-indigo-200">{t("reading.eyebrow")}</p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white">
            {book.title}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {book.currentPage} / {book.totalPages} {t("book.pages")}
          </p>

          <div className="mt-8">
            <NetworkStatus />
          </div>
          <div className="mt-4">
            <ProgressUpdater
              locale={locale}
              bookId={book.id}
              currentPage={book.currentPage}
              totalPages={book.totalPages}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
