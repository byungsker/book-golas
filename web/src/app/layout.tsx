import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { getLocale } from "next-intl/server";
import "@byungsker/blab-design-system/styles.css";
import "./globals.css";

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

const themeBootstrapScript = `
  const root = document.documentElement;
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  root.dataset.blabTheme = prefersLight ? "light" : "dark";
`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const english = locale === "en";

  return {
    metadataBase: new URL("https://bookgolas.com"),
    title: {
      default: english ? "Bookgolas" : "북골라스",
      template: english ? "%s | Bookgolas" : "%s | 북골라스",
    },
    description: english
      ? "Set goals for the books you want to read and record your reading every day."
      : "읽고 싶은 책을 목표로 만들고, 매일의 독서를 기록하세요. 북골라스와 함께라면 독서 습관이 달라집니다.",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      data-blab-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <script
          id="blab-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily: "var(--font-body)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </body>
    </html>
  );
}
