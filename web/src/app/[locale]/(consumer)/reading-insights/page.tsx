import { getTranslations } from "next-intl/server";
import { AiArtifactsClient } from "@/components/consumer/ai-artifacts-client";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import type { ConsumerLocale } from "@/lib/consumer/paths";

export default async function ReadingInsightsPage({ params }: { params: Promise<{ locale: ConsumerLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations("consumer");
  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("aiArtifacts.insights.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("aiArtifacts.insights.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("aiArtifacts.insights.description")}</p>
        <AiArtifactsClient locale={locale} kind="insights" />
      </main>
    </div>
  );
}
