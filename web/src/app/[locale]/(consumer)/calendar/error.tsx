"use client";

import { useTranslations } from "next-intl";
import { ConsumerErrorState } from "@/components/consumer/blab-primitives";

export default function CalendarError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("consumer");
  return (
    <main className="bookgolas-consumer-page flex min-h-[70dvh] items-center justify-center bg-[var(--blab-surface-scaffold)] px-4 text-[var(--blab-text-primary)]" data-route-state="error" data-testid="calendar-error-boundary">
      <ConsumerErrorState title={t("calendar.errorTitle")} message={t("calendar.errors.unavailable")} retryLabel={t("calendar.retry")} onRetry={reset} />
    </main>
  );
}
