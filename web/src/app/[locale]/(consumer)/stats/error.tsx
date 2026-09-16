"use client";

import { useTranslations } from "next-intl";
import { ConsumerErrorState } from "@/components/consumer/blab-primitives";

export default function StatsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("consumer");
  return (
    <main className="bookgolas-consumer-page flex min-h-[70dvh] items-center justify-center bg-[var(--blab-surface-scaffold)] px-4 text-[var(--blab-text-primary)]" data-route-state="error" data-testid="stats-error-boundary">
      <ConsumerErrorState title={t("stats.errorTitle")} message={t("stats.errors.unavailable")} retryLabel={t("stats.retry")} onRetry={reset} />
    </main>
  );
}
