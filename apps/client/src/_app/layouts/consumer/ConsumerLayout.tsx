import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsumerCard, ConsumerErrorState } from "@/shared/ui";
import { ConsumerShell } from "./ui/ConsumerShell";
import { ConsumerTimerProvider } from "@/features/reading-timer";
import { getConsumerSignInRedirectPath, isConsumerLocale } from "@/shared/routing";
import { getCurrentConsumerUser } from "@/shared/auth/index.server";

export default async function AuthenticatedConsumerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const { user, unavailable } = await getCurrentConsumerUser();
  if (!user && !unavailable) {
    redirect(getConsumerSignInRedirectPath(locale, `/${locale}/home`));
  }

  if (!user) {
    const t = await getTranslations("consumer");
    return (
      <main className="bookgolas-consumer-page flex min-h-screen items-center justify-center bg-[var(--blab-surface-scaffold)] px-[var(--blab-space-lg)] text-[var(--blab-text-primary)]" data-route-state="unavailable">
        <ConsumerCard className="max-w-lg">
          <ConsumerErrorState
            title={t("states.errorTitle")}
            message={t("states.errorDescription")}
          />
        </ConsumerCard>
      </main>
    );
  }

  return (
    <ConsumerTimerProvider locale={locale}>
      <ConsumerShell locale={locale}>{children}</ConsumerShell>
    </ConsumerTimerProvider>
  );
}
