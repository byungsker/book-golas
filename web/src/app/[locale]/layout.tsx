import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: {
    absolute: "북골라스 — 매일의 독서가 목표가 되는 곳",
  },
  description:
    "읽고 싶은 책을 목표로 만들고, 매일의 독서를 기록하세요. 북골라스와 함께라면 독서 습관이 달라집니다.",
  openGraph: {
    title: "북골라스 — 매일의 독서가 목표가 되는 곳",
    description: "독서 목표 설정, 진행률 추적, 스마트 알림. iOS 무료.",
    type: "website",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
