import { getTranslations } from "next-intl/server";
import { ConsumerLoadingState } from "@/components/consumer/blab-primitives";

export default async function CalendarLoading() {
  const t = await getTranslations("consumer");
  return (
    <main className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-12 text-[var(--blab-text-primary)] sm:px-6" aria-busy="true" data-route-state="pending" data-testid="calendar-loading">
      <div className="mx-auto max-w-6xl">
        <ConsumerLoadingState label={t("calendar.loading")} />
        <div className="mt-8 h-[38rem] animate-pulse rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)]" />
      </div>
    </main>
  );
}
