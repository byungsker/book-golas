import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConsentSettings } from "@/components/consumer/consent-settings";
import { ConsumerCard, ConsumerErrorState } from "@/components/consumer/blab-primitives";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { getConsumerPath, isConsumerLocale } from "@/lib/consumer/paths";
import { getCurrentConsumerUser } from "@/lib/consumer/queries";

export const dynamic = "force-dynamic";

export default async function ConsumerAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const { user, unavailable } = await getCurrentConsumerUser();
  if (!user && !unavailable) {
    redirect(
      `${getConsumerPath(locale, "/auth/sign-in")}?next=${encodeURIComponent(getConsumerPath(locale, "/account"))}`,
    );
  }

  const t = await getTranslations("consumer");

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale} authenticated={Boolean(user)} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("account.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("account.title")}</h1>
        <p className="mt-3 max-w-2xl break-keep text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("account.description")}</p>
        <section className="mt-8" aria-labelledby="consumer-consent-heading">
          <h2 id="consumer-consent-heading" className="sr-only">{t("consent.title")}</h2>
          {unavailable ? (
            <ConsumerCard>
              <ConsumerErrorState
                title={t("account.unavailableTitle")}
                message={t("consent.errors.load")}
                icon="⚠️"
              />
            </ConsumerCard>
          ) : <ConsentSettings />}
        </section>
      </main>
    </div>
  );
}
