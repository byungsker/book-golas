import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsumerCard, ConsumerErrorState } from "@/components/consumer/blab-primitives";
import { ConsumerShell } from "@/components/consumer/consumer-shell";
import { getConsumerSignInRedirectPath, isConsumerLocale } from "@/lib/consumer/paths";
import { getCurrentConsumerUser } from "@/lib/consumer/queries";

export const dynamic = "force-dynamic";

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

  return <ConsumerShell locale={locale}>{children}</ConsumerShell>;
}
