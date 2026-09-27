import Link from "next/link";
import { getTranslations } from "next-intl/server";

export type LegalLocale = "ko" | "en";

export function isLegalLocale(locale: string): locale is LegalLocale {
  return locale === "ko" || locale === "en";
}

function LegalDocument({
  locale,
  title,
  lastUpdated,
  backHome,
  children,
  copyright,
}: {
  locale: LegalLocale;
  title: string;
  lastUpdated: string;
  backHome: string;
  children: React.ReactNode;
  copyright: string;
}) {
  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}`}
          className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          {backHome}
        </Link>
        <h1 className="mb-8 mt-6 text-center text-3xl font-bold text-white">
          {title}
        </h1>
        <div className="prose prose-lg mx-auto">
          <p className="mb-4 text-gray-400">
            <strong className="text-gray-300">{lastUpdated}</strong>
          </p>
          {children}
        </div>
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>{copyright}</p>
        </div>
      </div>
    </main>
  );
}

export async function TermsPageContent({ locale }: { locale: LegalLocale }) {
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

export async function PrivacyPageContent({ locale }: { locale: LegalLocale }) {
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

export async function SupportPageContent({ locale }: { locale: LegalLocale }) {
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
          <Link href={`/${locale}/privacy`} className="text-blue-400 hover:underline">
            {t("privacyLink")}
          </Link>
        </li>
        <li>
          <Link href={`/${locale}/terms`} className="text-blue-400 hover:underline">
            {t("termsLink")}
          </Link>
        </li>
      </ul>
    </LegalDocument>
  );
}
