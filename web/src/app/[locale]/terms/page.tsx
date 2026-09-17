import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLegalLocale, TermsPageContent } from "@/components/legal/legal-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLegalLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title"), description: t("purposeBody") };
}

export default async function LocalizedTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLegalLocale(locale)) notFound();

  return <TermsPageContent locale={locale} />;
}
