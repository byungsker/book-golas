import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { isConsumerLocale } from "@/lib/consumer/paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "consumer.accountDeleted" });
  return { title: t("title"), description: t("description") };
}

export default async function AccountDeletedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "consumer.accountDeleted" });

  return (
    <main
      className="bookgolas-consumer-page flex min-h-screen items-center justify-center bg-[var(--blab-surface-scaffold)] px-4 py-12 text-[var(--blab-text-primary)]"
      data-testid="account-deleted-page"
    >
      <section className="w-full max-w-xl rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] p-8 text-center shadow-xl sm:p-12">
        <p className="text-sm font-semibold text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--blab-text-tertiary)]">{t("description")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-5 text-sm font-semibold text-white" data-testid="account-deleted-home">
            {t("backHome")}
          </Link>
          <Link href={`/${locale}/auth/sign-in`} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--blab-glass-border)] px-5 text-sm font-semibold" data-testid="account-deleted-sign-in">
            {t("signIn")}
          </Link>
        </div>
      </section>
    </main>
  );
}
