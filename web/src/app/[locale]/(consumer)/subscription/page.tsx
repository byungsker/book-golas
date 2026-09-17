import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConsumerCard, ConsumerEmptyState } from "@/components/consumer/blab-primitives";
import type { ConsumerLocale } from "@/lib/consumer/paths";

export default async function SubscriptionPage({ params }: { params: Promise<{ locale: ConsumerLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations("consumer.routes.subscription");
  return (
    <main className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] px-4 py-8 text-[var(--blab-text-primary)] sm:px-6 lg:px-8 lg:py-12" data-testid="subscription-disabled" data-route-state="disabled" data-subscription-enabled="false">
      <div className="mx-auto max-w-3xl">
        <ConsumerCard>
          <ConsumerEmptyState title={t("title")} message={t("description")} />
          <p className="mt-4 text-center text-sm font-semibold text-[var(--blab-text-secondary)]" data-testid="subscription-status">{t("status")}</p>
          <div className="mt-6 flex justify-center"><Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--blab-glass-border)] px-4 text-sm font-semibold underline-offset-4 hover:underline" data-testid="subscription-back">{t("back")}</Link></div>
        </ConsumerCard>
      </div>
    </main>
  );
}
