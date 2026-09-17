import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReadingAnalyticsClient } from "@/components/consumer/reading-analytics-client";
import { ConsumerCard, ConsumerErrorState } from "@/components/consumer/blab-primitives";
import { fetchOwnedReadingAnalyticsData } from "@/lib/consumer/queries";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale, type ConsumerLocale } from "@/lib/consumer/paths";
import {
  ReadingAnalyticsRequestSchema,
  ReadingAnalyticsStatusSchema,
  ReadingAnalyticsViewSchema,
  currentReadingAnalyticsWeekStart,
  currentCalendarMonth,
} from "@/lib/product/contracts";

export const dynamic = "force-dynamic";

function stringValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function failureMessage(t: Awaited<ReturnType<typeof getTranslations>>, errorCode: string | undefined): string {
  if (errorCode === "offline") return t("stats.errors.offline");
  if (errorCode === "consent_required") return t("stats.errors.consent_required");
  if (errorCode === "quota_exceeded") return t("stats.errors.quota_exceeded");
  if (errorCode === "validation_error") return t("stats.invalidRange");
  return t("stats.errors.unavailable");
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isConsumerLocale(rawLocale)) redirect("/ko/auth/sign-in");
  const locale: ConsumerLocale = rawLocale;
  const raw = await searchParams;
  const current = currentCalendarMonth();
  const rawView = stringValue(raw?.view);
  const viewResult = ReadingAnalyticsViewSchema.safeParse(rawView);
  const view = viewResult.success ? viewResult.data : "annual";
  const rawStatus = stringValue(raw?.status);
  const statusResult = ReadingAnalyticsStatusSchema.safeParse(rawStatus ?? "all");
  const status = statusResult.success ? statusResult.data : "all";
  const year = positiveInteger(stringValue(raw?.year)) ?? current.year;
  const month = positiveInteger(stringValue(raw?.month)) ?? current.month;
  const weekStart = stringValue(raw?.weekStart) ?? currentReadingAnalyticsWeekStart();
  const customStart = stringValue(raw?.customStart);
  const customEnd = stringValue(raw?.customEnd);
  const parsedRequest = ReadingAnalyticsRequestSchema.safeParse({
    view,
    year,
    ...(view === "monthly" ? { month } : {}),
    ...(view === "weekly" ? { weekStart } : {}),
    ...(view === "custom" ? { customStart, customEnd } : {}),
    status,
  });
  const t = await getTranslations("consumer");

  if (!parsedRequest.success) {
    return (
      <main className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-12 text-[var(--blab-text-primary)] sm:px-6 lg:px-8" data-route-state="error" data-testid="stats-invalid-range">
        <div className="mx-auto max-w-3xl"><ConsumerCard className="text-center"><ConsumerErrorState title={t("stats.errorTitle")} message={t("stats.invalidRange")} /><Link href={getConsumerPath(locale, "/stats")} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-retry">{t("stats.retry")}</Link></ConsumerCard></div>
      </main>
    );
  }

  const result = await fetchOwnedReadingAnalyticsData(parsedRequest.data);
  if (result.code === "unauthenticated") {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/stats")));
  }
  if (result.code !== "ok" || !result.data) {
    const invalid = result.errorCode === "validation_error";
    return (
      <main className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-12 text-[var(--blab-text-primary)] sm:px-6 lg:px-8" data-route-state="error" data-testid={invalid ? "stats-invalid-range" : "stats-error"} data-stats-error-code={result.errorCode ?? "unavailable"}>
        <div className="mx-auto max-w-3xl"><ConsumerCard className="text-center"><ConsumerErrorState title={t("stats.errorTitle")} message={failureMessage(t, result.errorCode)} /><Link href={getConsumerPath(locale, "/stats")} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-retry">{t("stats.retry")}</Link></ConsumerCard></div>
      </main>
    );
  }

  return <ReadingAnalyticsClient locale={locale} initialData={result.data} />;
}
