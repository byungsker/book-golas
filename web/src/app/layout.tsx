import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "북골라스",
    template: "%s | 북골라스",
  },
  description:
    "읽고 싶은 책을 목표로 만들고, 매일의 독서를 기록하세요. 북골라스와 함께라면 독서 습관이 달라집니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}
    >
      <body
        className="antialiased"
        style={{
          fontFamily: "var(--font-body)",
          backgroundColor: "#0D0F1A",
          color: "#FAFAFA",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </body>
    </html>
  );
}
