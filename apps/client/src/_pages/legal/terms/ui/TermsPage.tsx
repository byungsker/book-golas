import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLegalLocale } from "@/shared/config";
import { LegalDocument } from "@/shared/ui";

type TermsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLegalLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title"), description: t("purposeBody") };
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  if (!isLegalLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "terms" });
  return (
    <LegalDocument
      locale={locale}
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      backHome={t("backHome")}
      copyright={t("copyright")}
    >
      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("purposeTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("purposeBody")}</p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("definitionTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("definitionService")}</li>
        <li>{t("definitionUser")}</li>
        <li>{t("definitionMember")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("changeTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("changeNotice")}</li>
        <li>{t("changeLaw")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("usageTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("usageAvailability")}</li>
        <li>{t("usageMembership")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("signupTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("signupBody")}</p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("privacyTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("privacyBody")}</p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("paidTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("paidItem1")}</li>
        <li>{t("paidItem2")}</li>
        <li>{t("paidItem3")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("refundTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("refundItem1")}</li>
        <li>{t("refundItem2")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("liabilityTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>{t("liabilityItem1")}</li>
        <li>{t("liabilityItem2")}</li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("lawTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("lawBody")}</p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("operatorTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>
          <strong className="text-gray-200">{t("operatorNameLabel")}</strong>: {t("operatorName")}
        </li>
        <li>
          <strong className="text-gray-200">{t("operatorEmailLabel")}</strong>: support@bookgolas.app
        </li>
      </ul>
      <div className="mt-12 rounded-lg bg-white/5 p-4">
        <p className="text-sm text-gray-400">{t("note")}</p>
      </div>
    </LegalDocument>
  );
}
