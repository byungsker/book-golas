import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "북골라스 — 매일의 독서가 목표가 되는 곳",
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
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}
    >
      <body className="antialiased" style={{ fontFamily: "var(--font-body)", backgroundColor: "#0D0F1A", color: "#FAFAFA", WebkitFontSmoothing: "antialiased" }}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
