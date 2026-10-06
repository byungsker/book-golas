"use client";

import { useTranslations } from "next-intl";
import { ConsumerErrorState } from "@/shared/ui";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("consumer.auth");

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4">
      <ConsumerErrorState
        className="max-w-lg text-center"
        title={t("errors.title")}
        message={t("errors.generic")}
        retryLabel={t("retry")}
        onRetry={reset}
      />
    </main>
  );
}
