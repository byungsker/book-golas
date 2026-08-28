import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import { NetworkStatus } from "@/components/consumer/network-status";
import { ProgressUpdater } from "@/components/consumer/progress-updater";
import { getConsumerPath, isConsumerLocale } from "@/lib/consumer/paths";
import { fetchOwnedBook } from "@/lib/consumer/queries";
import { formatBookDate, getBookProgress } from "@/lib/consumer/types";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { locale, bookId } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const result = await fetchOwnedBook(bookId);
  if (result.code === "unauthenticated") {
    redirect(
      `${getConsumerPath(locale, "/auth/sign-in")}?next=${encodeURIComponent(getConsumerPath(locale, `/books/${bookId}`))}`,
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
  const statusKey = book.status;
  const statusLabel =
    {
      planned: t("book.status.planned"),
      reading: t("book.status.reading"),
      completed: t("book.status.completed"),
      will_retry: t("book.status.will_retry"),
      unknown: t("book.status.unknown"),
    }[statusKey];
  const progress = getBookProgress(book);

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white">
      <ConsumerHeader locale={locale} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <Link
          href={getConsumerPath(locale, "/home")}
          className="inline-flex rounded-md text-sm text-white/60 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          {t("book.backHome")}
        </Link>

        <article className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              aria-hidden="true"
              className="flex h-36 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300/30 to-sky-300/10 text-4xl shadow-inner shadow-white/10"
            >
              📖
            </div>
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-indigo-300/15 px-2.5 py-1 text-xs font-medium text-indigo-100">
                {statusLabel}
              </span>
              <h1 className="mt-4 break-words text-3xl font-semibold tracking-tight text-white">
                {book.title}
              </h1>
              <p className="mt-2 text-base text-white/60">
                {book.author || t("book.authorUnknown")}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/15 p-5">
            <div className="flex items-center justify-between gap-3 text-sm text-white/60">
              <span>{t("book.progressLabel")}</span>
              <span>
                {book.currentPage} / {book.totalPages} {t("book.pages")}
              </span>
            </div>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label={t("book.progressLabel")}
              aria-valuemin={0}
              aria-valuemax={book.totalPages || 1}
              aria-valuenow={book.currentPage}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-white/45">{t("book.startDate")}</p>
              <p className="mt-1 font-medium text-white/85">
                {formatBookDate(book.startDate, locale)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-white/45">{t("book.targetDate")}</p>
              <p className="mt-1 font-medium text-white/85">
                {formatBookDate(book.targetDate, locale)}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">{t("reading.title")}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{t("reading.description")}</p>
            </div>
            <NetworkStatus />
            <div className="mt-4">
              <ProgressUpdater
                locale={locale}
                bookId={book.id}
                currentPage={book.currentPage}
                totalPages={book.totalPages}
              />
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
