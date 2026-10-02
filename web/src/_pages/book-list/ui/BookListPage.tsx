import { getTranslations } from "next-intl/server";
import { AiArtifactsClient } from "@/features/ai-artifacts";
import { ConsumerHeader } from "@/widgets/consumer-header";
import type { ConsumerLocale } from "@/shared/routing";

export type BookListPageProps = {
  params: Promise<{ locale: ConsumerLocale }>;
};

export default async function BookListPage({ params }: BookListPageProps) {
  const { locale } = await params;
  const t = await getTranslations("consumer");

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("aiArtifacts.recommendations.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("aiArtifacts.recommendations.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("aiArtifacts.recommendations.description")}</p>
        <AiArtifactsClient locale={locale} kind="recommendations" />
      </main>
    </div>
  );
}
