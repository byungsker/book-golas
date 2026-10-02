"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getConsumerPath, isConsumerLocale } from "@/shared/routing";
import { ConsumerEmptyState } from "@/shared/ui";

export default function LocalizedNotFoundPage() {
  const rawLocale = useLocale();
  const locale = isConsumerLocale(rawLocale) ? rawLocale : "ko";
  const t = useTranslations("consumer.notFound");

  return (
    <main className="bookgolas-consumer-page flex min-h-screen items-center justify-center bg-[var(--blab-surface-scaffold)] px-[var(--blab-space-lg)] text-[var(--blab-text-primary)]">
      <div className="max-w-lg text-center">
        <ConsumerEmptyState title={t("title")} message={t("description")} />
        <Link
          href={getConsumerPath(locale, "")}
          className="mt-[var(--blab-space-xxl)] inline-flex min-h-[var(--blab-size-touch-target)] items-center rounded-[var(--blab-radius-control)] bg-[var(--blab-color-primary)] px-[var(--blab-space-xl)] text-white"
        >
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
