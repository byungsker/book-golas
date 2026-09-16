import { getTranslations } from "next-intl/server";
import { ConsumerLoadingState } from "@/components/consumer/blab-primitives";

export default async function StatsLoading() {
  const t = await getTranslations("consumer");
  return (
    <main className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-12 text-[var(--blab-text-primary)] sm:px-6 lg:px-8" aria-busy="true" data-route-state="pending" data-testid="stats-loading">
      <div className="mx-auto max-w-6xl">
        <ConsumerLoadingState label={t("stats.loading")} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)]" />)}
        </div>
        <div className="mt-4 h-[30rem] animate-pulse rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)]" />
      </div>
    </main>
  );
}
