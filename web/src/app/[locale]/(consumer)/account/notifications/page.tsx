import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsumerCard, ConsumerErrorState } from "@/components/consumer/blab-primitives";
import { WebPushSettingsClient } from "@/components/consumer/web-push-settings-client";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale } from "@/lib/consumer/paths";
import { getCurrentConsumerUser } from "@/lib/consumer/queries";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const { user, unavailable } = await getCurrentConsumerUser();
  if (!user && !unavailable) {
    redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/account/notifications")));
  }

  const t = await getTranslations("consumer");
  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("account.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("routes.accountNotifications.title")}</h1>
        <p className="mt-3 max-w-2xl break-keep text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("routes.accountNotifications.description")}</p>
        <section className="mt-8" aria-labelledby="consumer-account-notifications-heading">
          <h2 id="consumer-account-notifications-heading" className="sr-only">{t("routes.accountNotifications.title")}</h2>
          {unavailable ? (
            <ConsumerCard>
              <ConsumerErrorState title={t("account.unavailableTitle")} message={t("notifications.errorDescription")} icon="⚠️" />
            </ConsumerCard>
          ) : (
            <WebPushSettingsClient locale={locale} />
          )}
        </section>
      </main>
    </div>
  );
}
