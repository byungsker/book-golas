import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLegalLocale, PrivacyPageContent } from "@/components/legal/legal-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLegalLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title"), description: t("collectionBody") };
}

export default async function LocalizedPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLegalLocale(locale)) notFound();

  return <PrivacyPageContent locale={locale} />;
}
