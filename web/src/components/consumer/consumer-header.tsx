import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getConsumerPath, type ConsumerLocale } from "@/lib/consumer/paths";
import { SignOutButton } from "@/components/consumer/sign-out-button";

export async function ConsumerHeader({ locale }: { locale: ConsumerLocale }) {
  const t = await getTranslations("consumer");
  const otherLocale = locale === "ko" ? "en" : "ko";

  return (
    <header className="border-b border-white/10 bg-[#0d0f1a]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={getConsumerPath(locale, "/home")}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <Image
            src="/logo-bookgolas.png"
            alt={t("brand")}
            width={36}
            height={36}
            className="rounded-xl"
          />
          <span className="truncate font-semibold text-white">{t("brand")}</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label={t("nav.label")}>
          <Link
            href={getConsumerPath(locale, "/home")}
            className="rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            {t("nav.library")}
          </Link>
          <Link
            href={getConsumerPath(otherLocale, "/home")}
            className="rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            {otherLocale.toUpperCase()}
          </Link>
          <SignOutButton locale={locale} />
        </nav>
      </div>
    </header>
  );
}
