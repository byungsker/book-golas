"use client";

import { useTranslations } from "next-intl";
import { ConsumerErrorState } from "@/components/consumer/blab-primitives";

export default function ConsumerHomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("consumer");

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4">
      <ConsumerErrorState
        className="max-w-md text-center"
        title={t("states.errorTitle")}
        message={t("states.errorDescription")}
        retryLabel={t("states.retry")}
        onRetry={reset}
      />
    </main>
  );
}
