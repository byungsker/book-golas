import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookReviewClient } from "@/components/consumer/book-review-client";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ConsumerCard, ConsumerEmptyState } from "@/components/consumer/blab-primitives";
import { fetchOwnedBookDetail } from "@/lib/consumer/queries";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale } from "@/lib/consumer/paths";
import type { ConsumerLocale } from "@/lib/consumer/paths";

export const dynamic = "force-dynamic";

export default async function BookReviewPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { locale, bookId } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const result = await fetchOwnedBookDetail(bookId);
  if (result.code === "unauthenticated") {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, `/books/${bookId}/review`)));
  }

  const t = await getTranslations("consumer");
  if (result.code !== "ok" || !result.book) {
    return (
      <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-route-state={result.code === "unavailable" ? "unavailable" : "not-found-or-forbidden"}>
        <ConsumerHeader locale={locale as ConsumerLocale} authenticated={result.authenticated} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <ConsumerCard>
            <ConsumerEmptyState
              title={result.code === "unavailable" ? t("states.errorTitle") : t("states.permissionTitle")}
              message={result.code === "unavailable" ? t("states.errorDescription") : t("states.permissionDescription")}
            />
            <Link href={getConsumerPath(locale, "/home")} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">{t("book.backHome")}</Link>
          </ConsumerCard>
        </main>
      </div>
    );
  }

  return <BookReviewClient locale={locale} initialBook={result.book} />;
}
