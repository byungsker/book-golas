import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLegalLocale } from "@/shared/config";
import { LegalDocument } from "@/shared/ui";

type SupportPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: SupportPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLegalLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "support" });
  return { title: t("title"), description: t("contactBody") };
}

export default async function SupportPage({ params }: SupportPageProps) {
  const { locale } = await params;
  if (!isLegalLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "support" });
  return (
    <LegalDocument
      locale={locale}
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      backHome={t("backHome")}
      copyright={t("copyright")}
    >
      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("contactTitle")}
      </h2>
      <p className="mb-4 text-gray-300">{t("contactBody")}</p>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>
          <strong className="text-gray-200">{t("emailLabel")}</strong>:{" "}
          <a href="mailto:support@bookgolas.app" className="text-blue-400 hover:underline">
            support@bookgolas.app
          </a>
        </li>
      </ul>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("faqTitle")}
      </h2>
      <h3 className="mb-2 mt-4 text-lg font-medium text-gray-200">{t("accountQuestion")}</h3>
      <p className="mb-4 text-gray-300">{t("accountAnswer")}</p>
      <h3 className="mb-2 mt-4 text-lg font-medium text-gray-200">{t("proQuestion")}</h3>
      <p className="mb-4 text-gray-300">{t("proAnswer")}</p>
      <h3 className="mb-2 mt-4 text-lg font-medium text-gray-200">{t("recallQuestion")}</h3>
      <p className="mb-4 text-gray-300">{t("recallAnswer")}</p>
      <h3 className="mb-2 mt-4 text-lg font-medium text-gray-200">{t("backupQuestion")}</h3>
      <p className="mb-4 text-gray-300">{t("backupAnswer")}</p>
      <h3 className="mb-2 mt-4 text-lg font-medium text-gray-200">{t("deleteQuestion")}</h3>
      <p className="mb-4 text-gray-300">{t("deleteAnswer")}</p>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-100">
        {t("relatedTitle")}
      </h2>
      <ul className="mb-4 list-disc pl-6 text-gray-300">
        <li>
          <Link href={"/" + locale + "/privacy"} className="text-blue-400 hover:underline">
            {t("privacyLink")}
          </Link>
        </li>
        <li>
          <Link href={"/" + locale + "/terms"} className="text-blue-400 hover:underline">
            {t("termsLink")}
          </Link>
        </li>
      </ul>
    </LegalDocument>
  );
}
