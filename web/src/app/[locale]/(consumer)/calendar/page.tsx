import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarClient } from "@/components/consumer/calendar-client";
import { ConsumerCard, ConsumerErrorState } from "@/components/consumer/blab-primitives";
import { fetchOwnedCalendarData } from "@/lib/consumer/queries";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale } from "@/lib/consumer/paths";
import { CalendarFilterSchema, currentCalendarMonth } from "@/lib/product/contracts";

export const dynamic = "force-dynamic";

function positiveInteger(value: string | string[] | undefined): number | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^\d+$/.test(candidate)) return null;
  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const rawSearchParams = await searchParams;
  const current = currentCalendarMonth();
  const requestedYear = positiveInteger(rawSearchParams?.year);
  const requestedMonth = positiveInteger(rawSearchParams?.month);
  const year = requestedYear && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : current.year;
  const month = requestedMonth && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : current.month;
  const rawFilter = Array.isArray(rawSearchParams?.filter) ? rawSearchParams.filter[0] : rawSearchParams?.filter;
  const filterResult = CalendarFilterSchema.safeParse(rawFilter ?? "all");
  const filter = filterResult.success ? filterResult.data : "all";
  const result = await fetchOwnedCalendarData({ year, month, filter });

  if (result.code === "unauthenticated") {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/calendar")));
  }

  const t = await getTranslations("consumer");
  if (result.code !== "ok" || !result.data) {
    const errorMessage = result.errorCode === "offline"
      ? t("calendar.errors.offline")
      : result.errorCode === "consent_required"
        ? t("calendar.errors.consent_required")
        : result.errorCode === "quota_exceeded"
          ? t("calendar.errors.quota_exceeded")
          : t("calendar.errors.unavailable");
    return (
      <main className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-12 text-[var(--blab-text-primary)] sm:px-6 lg:px-8" data-route-state="error" data-testid="calendar-error" data-calendar-error-code={result.errorCode ?? "unavailable"}>
        <div className="mx-auto max-w-3xl">
          <ConsumerCard className="text-center">
            <ConsumerErrorState title={t("calendar.errorTitle")} message={errorMessage} />
            <Link href={getConsumerPath(locale, `/calendar?year=${year}&month=${month}&filter=${filter}`)} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="calendar-retry">
              {t("calendar.retry")}
            </Link>
          </ConsumerCard>
        </div>
      </main>
    );
  }

  return <CalendarClient locale={locale} initialData={result.data} />;
}
