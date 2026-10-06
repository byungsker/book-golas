"use client";

import { useTranslations } from "next-intl";
import { ConsumerErrorState } from "@/shared/ui";

export default function AnnouncementsError({ reset }: { readonly error: Error; readonly reset: () => void }) {
  const t = useTranslations("consumer.announcements");
  return <main className="flex min-h-[70dvh] items-center justify-center px-[var(--blab-space-lg)]" data-route-state="error"><ConsumerErrorState title={t("errorTitle")} message={t("errorDescription")} retryLabel={t("retry")} onRetry={reset} /></main>;
}
