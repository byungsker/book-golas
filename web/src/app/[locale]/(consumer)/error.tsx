"use client";

import { useTranslations } from "next-intl";
import { ConsumerErrorState } from "@/components/consumer/blab-primitives";

export default function ConsumerRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("consumer.states");

  return (
    <main className="bookgolas-consumer-page flex min-h-screen items-center justify-center bg-[var(--blab-surface-scaffold)] px-[var(--blab-space-lg)] text-[var(--blab-text-primary)]">
      <ConsumerErrorState
        className="max-w-lg text-center"
        title={t("errorTitle")}
        message={t("errorDescription")}
        retryLabel={t("retry")}
        onRetry={reset}
      />
    </main>
  );
}
