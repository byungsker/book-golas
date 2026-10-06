import { getTranslations } from "next-intl/server";
import { ConsumerHeader } from "@/widgets/consumer-header";
import { ConsumerCard, ConsumerEmptyState } from "@/shared/ui";
import type { ConsumerLocale } from "@/shared/routing";

export type BookScanPageProps = {
  params: Promise<{ locale: ConsumerLocale }>;
};

export default async function BookScanPage({ params }: BookScanPageProps) {
  const { locale } = await params;
  const t = await getTranslations("consumer.routes");

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <ConsumerCard data-testid="consumer-route-scan">
          <ConsumerEmptyState
            title={t("scan.title")}
            message={t("scan.description")}
          />
        </ConsumerCard>
      </main>
    </div>
  );
}
