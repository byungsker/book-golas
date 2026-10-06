import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLegalLocale } from "@/shared/config";
import { LegalDocument } from "@/shared/ui";

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLegalLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title"), description: t("collectionBody") };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!isLegalLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "privacy" });
  return (
    <LegalDocument
      locale={locale}
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      backHome={t("backHome")}
      copyright={t("copyright")}
    >
      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("collectionTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("collectionBody")}</p>
      <h3 className="mb-2 mt-4 text-lg font-medium text-gray-200">
        {t("collectionHeading")}
      </h3>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("collectionEmail")}</li>
        <li>{t("collectionName")}</li>
        <li>{t("collectionReading")}</li>
        <li>{t("collectionDevice")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("methodTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("methodDirect")}</li>
        <li>{t("methodAutomatic")}</li>
        <li>{t("methodSupport")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("thirdPartyTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("thirdPartyBody")}</p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("entrustTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("entrustBody")}</p>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("entrustSupabase")}</li>
        <li>{t("entrustRevenueCat")}</li>
        <li>{t("entrustFirebase")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("officerTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>
          <strong className="text-gray-200">{t("officerNameLabel")}</strong>: {t("officerName")}
        </li>
        <li>
          <strong className="text-gray-200">{t("officerEmailLabel")}</strong>: support@bookgolas.app
        </li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("contactTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("contactBody")}</p>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>
          <strong className="text-gray-200">{t("contactEmailLabel")}</strong>: support@bookgolas.app
        </li>
      </ul>
    </LegalDocument>
  );
}
