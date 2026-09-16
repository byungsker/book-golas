import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AiArtifactsClient } from "@/components/consumer/ai-artifacts-client";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ConsumerCard, ConsumerEmptyState } from "@/components/consumer/blab-primitives";
import { fetchOwnedBookDetail } from "@/lib/consumer/queries";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale, type ConsumerLocale } from "@/lib/consumer/paths";

export const dynamic = "force-dynamic";

export default async function BookMindMapPage({ params }: { params: Promise<{ locale: string; bookId: string }> }) {
  const { locale: rawLocale, bookId } = await params;
  if (!isConsumerLocale(rawLocale)) redirect("/ko/auth/sign-in");
  const locale: ConsumerLocale = rawLocale;
  const result = await fetchOwnedBookDetail(bookId);
  if (result.code === "unauthenticated") redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, `/books/${bookId}/mind-map`)));
  const t = await getTranslations("consumer");
  if (result.code !== "ok" || !result.book) {
    return (
      <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-route-state={result.code === "unavailable" ? "unavailable" : "not-found-or-forbidden"}>
        <ConsumerHeader locale={locale} authenticated={result.authenticated} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"><ConsumerCard><ConsumerEmptyState title={result.code === "unavailable" ? t("states.errorTitle") : t("states.permissionTitle")} message={result.code === "unavailable" ? t("states.errorDescription") : t("states.permissionDescription")} /><Link href={getConsumerPath(locale, "/home")} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("book.backHome")}</Link></ConsumerCard></main>
      </div>
    );
  }
  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link href={getConsumerPath(locale, `/books/${result.book.id}`)} className="text-sm text-[var(--blab-text-tertiary)] underline-offset-4 hover:text-[var(--blab-text-primary)] hover:underline">← {t("aiArtifacts.mindmap.back")}</Link>
        <AiArtifactsClient locale={locale} kind="mindmap" bookId={result.book.id} bookTitle={result.book.title} />
      </main>
    </div>
  );
}
