"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { WaitlistModal } from "@/components/waitlist-modal";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, visible };
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div
      className="flex items-center gap-1 text-xs"
      style={{ color: "rgba(255,255,255,0.45)" }}
    >
      <button
        onClick={() => switchLocale("ko")}
        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${locale === "ko" ? "text-white bg-white/10" : "hover:text-white/70"}`}
        disabled={isPending}
      >
        KO
      </button>
      <span>/</span>
      <button
        onClick={() => switchLocale("en")}
        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${locale === "en" ? "text-white bg-white/10" : "hover:text-white/70"}`}
        disabled={isPending}
      >
        EN
      </button>
    </div>
  );
}

function ProgressBar({ percent, color = "#5B7FFF" }: { percent: number; color?: string }) {
  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{ height: 4, background: "rgba(255,255,255,0.08)" }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: 2,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

function PhoneMockup() {
  const t = useTranslations("mockup");
  const [count, setCount] = useState(2);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);

  const books = [
    {
      id: 1,
      title: "리팩터링 2판",
      author: "마틴 파울러",
      progress: 0,
      total: 550,
      todayPercent: 0,
      overallPercent: 0,
      dday: "D-7",
      ddayType: "future" as const,
      cover: "/book-covers/book-1.jpg",
      active: true,
    },
    {
      id: 2,
      title: "미니멀리즘 프로그래머",
      author: "데이비드 토머스",
      progress: 14,
      total: 192,
      todayPercent: 7,
      overallPercent: 7,
      dday: "D+23",
      ddayType: "past" as const,
      cover: "/book-covers/book-2.jpg",
      active: false,
    },
    {
      id: 3,
      title: "히사이시 조의 음악일기",
      author: "히사이시 조",
      progress: 128,
      total: 288,
      todayPercent: 44,
      overallPercent: 44,
      dday: "D+21",
      ddayType: "past" as const,
      cover: "/book-covers/book-3.jpg",
      active: false,
    },
  ];

  const typingText = t("typingBook");

  useEffect(() => {
    let i = 0;
    const start = setInterval(() => {
      if (i <= typingText.length) {
        setTyped(typingText.slice(0, i));
        setTyping(true);
        i++;
      } else {
        clearInterval(start);
        setTimeout(() => {
          setCount((c) => Math.min(c + 1, books.length));
          setTyped("");
          setTyping(false);
          setTimeout(() => setCount(2), 4800);
        }, 600);
      }
    }, 80);
    return () => clearInterval(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="relative flex items-center justify-center select-none">
      <div
        className="absolute inset-0 rounded-[40px] pointer-events-none animate-pulse"
        style={{
          background: "rgba(91,127,255,0.14)",
          filter: "blur(32px)",
          zIndex: 0,
        }}
      />
      <div
        className="relative z-10 overflow-hidden phone-glow"
        style={{
          width: 268,
          height: 558,
          borderRadius: 44,
          background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
          border: "1.5px solid rgba(255,255,255,0.1)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.07), 0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
          style={{
            width: 88,
            height: 24,
            background: "#000",
            borderRadius: 12,
          }}
        />

        <div className="absolute inset-0 flex flex-col pt-14 pb-6 px-4">
          <div
            className="flex justify-between items-center mb-4 px-1"
            style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}
          >
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <LiveDot />
              <span style={{ fontSize: 9, color: "#34d399" }}>
                {t("realtime")}
              </span>
            </div>
          </div>

          <div className="mb-2 px-1">
            <div
              className="text-white font-semibold"
              style={{ fontSize: 14, fontFamily: "var(--font-display)" }}
            >
              {t("headerTitle")}
            </div>
          </div>

          <div className="flex items-center gap-1 mb-2 px-0.5">
            <span
              className="px-2.5 py-1 rounded-full"
              style={{ fontSize: 8.5, fontWeight: 600, background: "#fff", color: "#000" }}
            >
              {t("tabReading")}
            </span>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{ fontSize: 8.5, fontWeight: 500, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {t("tabToRead")}
            </span>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{ fontSize: 8.5, fontWeight: 500, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {t("tabDone")}
            </span>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{ fontSize: 7.5, fontWeight: 500, color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              ···
            </span>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            {books.slice(0, count).map((book, i) => {
              const ddayBg = book.ddayType === "future" ? "rgba(91,127,255,0.2)" : "rgba(255,107,107,0.2)";
              const ddayFg = book.ddayType === "future" ? "#6B8AFF" : "#FF6B6B";
              const ddayBorder = book.ddayType === "future" ? "rgba(91,127,255,0.35)" : "rgba(255,107,107,0.35)";
              return (
                <div
                  key={book.id}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    animation: i >= 2 ? "book-item 0.4s ease-out both" : "none",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="relative rounded-md flex-shrink-0 overflow-hidden"
                      style={{
                        width: 36,
                        height: 48,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.3)",
                      }}
                    >
                      <Image
                        src={book.cover}
                        alt={book.title}
                        fill
                        sizes="36px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold truncate"
                        style={{ fontSize: 10.5, color: "rgba(255,255,255,0.92)", fontFamily: "var(--font-display)" }}
                      >
                        {book.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="rounded-md font-semibold"
                          style={{
                            fontSize: 7.5,
                            background: ddayBg,
                            color: ddayFg,
                            border: `1px solid ${ddayBorder}`,
                            padding: "1px 5px",
                          }}
                        >
                          {book.dday}
                        </span>
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.42)" }}>
                          {book.progress}/{book.total} {t("pagesRead")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span style={{ fontSize: 6.5, color: "rgba(255,255,255,0.38)", minWidth: 26 }}>
                          {t("todayGoalLabel")}
                        </span>
                        <div className="flex-1">
                          <ProgressBar percent={book.todayPercent} color="#10B981" />
                        </div>
                        <span style={{ fontSize: 7, color: "#10B981", minWidth: 18, textAlign: "right" }}>
                          {book.todayPercent}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span style={{ fontSize: 6.5, color: "rgba(255,255,255,0.38)", minWidth: 26 }}>
                          {t("overallLabel")}
                        </span>
                        <div className="flex-1">
                          <ProgressBar percent={book.overallPercent} color="#5B7FFF" />
                        </div>
                        <span style={{ fontSize: 7, color: "#5B7FFF", minWidth: 18, textAlign: "right" }}>
                          {book.overallPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-start mt-1" style={{ color: "rgba(255,255,255,0.22)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}

            {typing && (
              <div
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: "rgba(91,127,255,0.06)",
                  border: "1px solid rgba(91,127,255,0.22)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(91,127,255,0.25)",
                      border: "1px solid rgba(91,127,255,0.4)",
                    }}
                  >
                    <span style={{ fontSize: 9 }}>✨</span>
                  </div>
                  <span
                    className="flex-1"
                    style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-display)" }}
                  >
                    {typed}
                    <span className="animate-pulse">|</span>
                  </span>
                </div>
                <div style={{ fontSize: 8, color: "rgba(107,138,255,0.6)" }}>
                  {t("typingBy")}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 relative" style={{ height: 40 }}>
            <div
              className="absolute inset-x-0 top-0 bottom-0 rounded-full flex items-center justify-around px-3"
              style={{
                background: "rgba(24,26,44,0.92)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                marginRight: 36,
              }}
            >
              {[
                { label: "홈", active: true, icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                )},
                { label: "서재", icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                    <path d="M18 13l-6-6-2 2 6 6"/>
                    <path d="M2 2l7.586 7.586"/>
                    <circle cx="11" cy="11" r="2"/>
                  </svg>
                )},
                { label: "상태", icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
                  </svg>
                )},
                { label: "캘린더", icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                )},
                { label: "MY", icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )},
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center"
                  style={{
                    color: item.active ? "white" : "rgba(255,255,255,0.42)",
                    gap: 1,
                    background: item.active ? "rgba(255,255,255,0.07)" : "transparent",
                    borderRadius: 9999,
                    width: 32,
                    height: 32,
                  }}
                >
                  {item.icon}
                  <span style={{ fontSize: 6.5, fontWeight: item.active ? 600 : 400 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="absolute right-0 top-0 rounded-full flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                background: "rgba(24,26,44,0.92)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                backdropFilter: "blur(20px)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          style={{
            width: 96,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.18)",
          }}
        />
      </div>
    </div>
  );
}

function ReadingListPhone() {
  const books = [
    {
      title: "리팩터링 2판",
      dday: "D-7",
      ddayType: "future" as const,
      todayPercent: 0,
      overallPercent: 0,
      pages: "0/550",
      cover: "/book-covers/book-1.jpg",
    },
    {
      title: "미니멀리즘 프로그래머",
      dday: "D+23",
      ddayType: "past" as const,
      todayPercent: 7,
      overallPercent: 7,
      pages: "14/192",
      cover: "/book-covers/book-2.jpg",
    },
    {
      title: "히사이시 조의 음악일기",
      dday: "D+21",
      ddayType: "past" as const,
      todayPercent: 44,
      overallPercent: 44,
      pages: "128/288",
      cover: "/book-covers/book-3.jpg",
    },
    {
      title: "시대예보: 경량문명의 탄생",
      dday: "시작 전",
      ddayType: "neutral" as const,
      todayPercent: 0,
      overallPercent: 0,
      pages: "0/312",
      cover: null as string | null,
    },
  ];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 240,
        height: 500,
        borderRadius: 40,
        background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 32px 64px rgba(0,0,0,0.55)",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{ width: 80, height: 22, background: "#000", borderRadius: 11 }}
      />
      <div className="absolute inset-0 flex flex-col pt-12 pb-5 px-3.5">
        <div
          className="flex justify-between items-center mb-3 px-1"
          style={{ fontSize: 9, color: "rgba(255,255,255,0.38)" }}
        >
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <LiveDot />
            <span style={{ fontSize: 8, color: "#34d399" }}>진행 중</span>
          </div>
        </div>
        <div className="mb-3">
          <div className="text-white font-bold" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
            독서 목록
          </div>
        </div>
        <div className="flex items-center gap-1 mb-2.5 px-0.5">
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ fontSize: 7.5, fontWeight: 600, background: "#fff", color: "#000" }}
          >
            독서 중
          </span>
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ fontSize: 7.5, fontWeight: 500, color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            읽을 예정
          </span>
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ fontSize: 7.5, fontWeight: 500, color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            완독
          </span>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          {books.map((book, i) => {
            const ddayBg = book.ddayType === "future"
              ? "rgba(91,127,255,0.2)"
              : book.ddayType === "past"
                ? "rgba(255,107,107,0.2)"
                : "rgba(255,255,255,0.08)";
            const ddayFg = book.ddayType === "future"
              ? "#6B8AFF"
              : book.ddayType === "past"
                ? "#FF6B6B"
                : "rgba(255,255,255,0.55)";
            const ddayBorder = book.ddayType === "future"
              ? "rgba(91,127,255,0.35)"
              : book.ddayType === "past"
                ? "rgba(255,107,107,0.35)"
                : "rgba(255,255,255,0.15)";
            return (
              <div
                key={i}
                className="rounded-xl px-2.5 py-2"
                style={{
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="relative rounded-md flex-shrink-0 overflow-hidden"
                    style={{
                      width: 32,
                      height: 44,
                      background: book.cover ? "transparent" : "linear-gradient(135deg,#2a2d3f,#1a1d2e)",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 2px 5px rgba(0,0,0,0.3)",
                    }}
                  >
                    {book.cover ? (
                      <Image
                        src={book.cover}
                        alt={book.title}
                        fill
                        sizes="32px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}
                      >
                        📘
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold truncate"
                      style={{ fontSize: 9.5, color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-display)" }}
                    >
                      {book.title}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="rounded-md font-semibold"
                        style={{
                          fontSize: 6.5,
                          background: ddayBg,
                          color: ddayFg,
                          border: `1px solid ${ddayBorder}`,
                          padding: "1px 4px",
                        }}
                      >
                        {book.dday}
                      </span>
                      <span style={{ fontSize: 7.5, color: "rgba(255,255,255,0.38)" }}>
                        {book.pages} 페이지
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span style={{ fontSize: 6, color: "rgba(255,255,255,0.38)", minWidth: 22 }}>오늘</span>
                      <div className="flex-1">
                        <ProgressBar percent={book.todayPercent} color="#10B981" />
                      </div>
                      <span style={{ fontSize: 6.5, color: "#10B981", minWidth: 16, textAlign: "right" }}>
                        {book.todayPercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span style={{ fontSize: 6, color: "rgba(255,255,255,0.38)", minWidth: 22 }}>전체</span>
                      <div className="flex-1">
                        <ProgressBar percent={book.overallPercent} color="#5B7FFF" />
                      </div>
                      <span style={{ fontSize: 6.5, color: "#5B7FFF", minWidth: 16, textAlign: "right" }}>
                        {book.overallPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-start mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 80, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

function ReadingLogPhone() {
  const calendarDays = [
    0, 0, 0, 0, 0, 1, 2,
    3, 1, 2, 0, 3, 2, 1,
    2, 3, 1, 0, 2, 1, 3,
    2, 1, 0, 3, 2, 1, 2,
  ];
  const dayHeaders = ["월", "화", "수", "목", "금", "토", "일"];
  const filterTabs = ["전체", "독서", "메모", "리뷰"];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 268,
        height: 558,
        borderRadius: 44,
        background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 40px 80px rgba(0,0,0,0.6)",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{ width: 88, height: 24, background: "#000", borderRadius: 12 }}
      />
      <div className="absolute inset-0 flex flex-col pt-14 pb-6 px-4">
        <div
          className="flex justify-between items-center mb-4 px-1"
          style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}
        >
          <span>9:41</span>
          <span>독서 기록</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
            <path d="M9 3L5 7l4 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-white font-bold" style={{ fontSize: 15, fontFamily: "var(--font-display)" }}>
            2026년 4월
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
            <path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="flex gap-1.5 mb-3">
          {filterTabs.map((tab, i) => (
            <div
              key={i}
              className="flex-1 text-center py-1 rounded-lg"
              style={{
                fontSize: 8.5,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "white" : "rgba(255,255,255,0.35)",
                background: i === 0 ? "rgba(91,127,255,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === 0 ? "rgba(91,127,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-2.5 mb-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {dayHeaders.map((d, i) => (
              <div key={i} className="text-center" style={{ fontSize: 7, color: "rgba(255,255,255,0.3)" }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((level, i) => {
              const isHighlight = i === 9 || i === 16 || i === 20;
              const highlightCover = i === 9
                ? "linear-gradient(135deg,#c6dfe7 0%,#6e96a4 100%)"
                : i === 16
                  ? "linear-gradient(135deg,#d5d9e3 0%,#9aa0ae 100%)"
                  : "linear-gradient(135deg,#b8342d 0%,#7a2820 100%)";
              if (isHighlight) {
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-md relative overflow-hidden"
                    style={{
                      background: highlightCover,
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span
                      className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center"
                      style={{
                        width: 10, height: 10,
                        background: "#5B7FFF",
                        color: "#fff",
                        fontSize: 6,
                        fontWeight: 700,
                      }}
                    >
                      {i === 9 ? 2 : 1}
                    </span>
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2"
                      style={{ fontSize: 6, color: "rgba(255,255,255,0.95)", fontWeight: 700 }}
                    >
                      {i + 1}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md flex items-center justify-center"
                  style={{
                    background: level === 0
                      ? "rgba(255,255,255,0.03)"
                      : level === 1
                        ? "rgba(16,185,129,0.18)"
                        : level === 2
                          ? "rgba(16,185,129,0.38)"
                          : "rgba(16,185,129,0.62)",
                  }}
                >
                  <span style={{ fontSize: 7, color: level > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}>
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-white" style={{ fontSize: 11, fontFamily: "var(--font-display)" }}>
              오늘 독서
            </div>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}>4월 10일</span>
          </div>
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="relative rounded-md flex-shrink-0 overflow-hidden"
                style={{
                  width: 32,
                  height: 44,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1), 0 2px 5px rgba(0,0,0,0.3)",
                }}
              >
                <Image
                  src="/book-covers/book-3.jpg"
                  alt="히사이시 조의 음악일기"
                  fill
                  sizes="32px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white font-medium truncate" style={{ fontSize: 10, fontFamily: "var(--font-display)" }}>
                    히사이시 조의 음악일기
                  </span>
                  <span style={{ fontSize: 8, color: "#34d399", fontWeight: 600 }}>+18p</span>
                </div>
                <ProgressBar percent={44} color="#5B7FFF" />
                <div className="mt-0.5 flex justify-between" style={{ fontSize: 7.5, color: "rgba(255,255,255,0.4)" }}>
                  <span>128 / 288</span>
                  <span>완독까지 160p</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-2.5"
          style={{ background: "rgba(91,127,255,0.08)", border: "1px solid rgba(91,127,255,0.2)" }}
        >
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 11 }}>✨</span>
            <div style={{ fontSize: 9, color: "rgba(180,200,255,0.95)", lineHeight: 1.4 }}>
              이 달에 2권 기록 · 하이라이트 0 · 메모 1 · 사진 1
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 96, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

function StatsPhone() {
  const tabs = ["개요", "분석", "활동"];
  const heatmapLevels = [
    0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,2,0,0,0,0,0,0,0,
    0,0,0,0,0,3,1,0,0,0,0,0,0,
    0,0,0,0,0,4,0,0,0,0,0,0,0,
    0,0,0,0,0,4,0,1,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,
  ];
  const heatmapBg = (l: number) =>
    l === 0 ? "rgba(255,255,255,0.04)"
      : l === 1 ? "rgba(16,185,129,0.25)"
        : l === 2 ? "rgba(16,185,129,0.45)"
          : l === 3 ? "rgba(16,185,129,0.65)"
            : "rgba(52,211,153,0.95)";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 240,
        height: 500,
        borderRadius: 40,
        background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 32px 64px rgba(0,0,0,0.55)",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{ width: 80, height: 22, background: "#000", borderRadius: 11 }}
      />
      <div className="absolute inset-0 flex flex-col pt-12 pb-5 px-3.5">
        <div
          className="flex justify-between items-center mb-3 px-1"
          style={{ fontSize: 9, color: "rgba(255,255,255,0.38)" }}
        >
          <span>9:41</span>
          <span>나의 독서 상태</span>
        </div>

        <div className="flex gap-1 mb-3">
          {tabs.map((tab, i) => (
            <div
              key={i}
              className="flex-1 text-center py-1.5 rounded-lg"
              style={{
                fontSize: 9,
                fontWeight: i === 2 ? 600 : 400,
                color: i === 2 ? "white" : "rgba(255,255,255,0.35)",
                background: i === 2 ? "rgba(91,127,255,0.2)" : "transparent",
                border: i === 2 ? "1px solid rgba(91,127,255,0.3)" : "1px solid transparent",
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-2.5 mb-2.5"
          style={{ background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)" }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: "rgba(255,107,107,0.2)" }}
            >
              <span style={{ fontSize: 10 }}>🔥</span>
            </div>
            <div className="text-white font-semibold" style={{ fontSize: 9.5, fontFamily: "var(--font-display)" }}>
              2026년 독서 활동
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <div className="font-bold" style={{ fontSize: 14, color: "white", fontFamily: "var(--font-display)" }}>5일</div>
              <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.4)" }}>읽은 날</div>
            </div>
            <div className="w-px h-7" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="flex flex-col items-center flex-1">
              <div className="font-bold" style={{ fontSize: 14, color: "white", fontFamily: "var(--font-display)" }}>672</div>
              <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.4)" }}>총 페이지</div>
            </div>
            <div className="w-px h-7" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="flex flex-col items-center flex-1">
              <div className="font-bold" style={{ fontSize: 14, color: "white", fontFamily: "var(--font-display)" }}>134.4p</div>
              <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.4)" }}>일 평균</div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-2 mb-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.35)" }}>일 월 화 수 목 금 토</span>
          </div>
          <div className="grid grid-cols-13 gap-px" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
            {heatmapLevels.map((level, i) => (
              <div
                key={i}
                className="rounded-sm aspect-square"
                style={{ background: heatmapBg(level) }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1" style={{ fontSize: 6, color: "rgba(255,255,255,0.3)" }}>
            <span>1월</span><span>3월</span><span>5월</span><span>7월</span><span>9월</span><span>11월</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 mb-2">
          {[
            { label: "총 페이지", value: "470p", color: "#5B7FFF" },
            { label: "일 평균", value: "94p", color: "#10B981" },
            { label: "최대 일일", value: "142p", color: "#F59E0B" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-lg p-1.5 text-center"
              style={{
                background: `${stat.color}10`,
                border: `1px solid ${stat.color}25`,
              }}
            >
              <div className="font-bold" style={{ fontSize: 11, color: stat.color, fontFamily: "var(--font-display)" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.42)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "연속 일수", value: "0일", color: "#FF6B6B" },
            { label: "최소 일일", value: "10p", color: "#14b8a6" },
            { label: "오늘 목표", value: "0%", color: "#10B981" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-lg p-1.5 text-center"
              style={{
                background: `${stat.color}10`,
                border: `1px solid ${stat.color}25`,
              }}
            >
              <div className="font-bold" style={{ fontSize: 11, color: stat.color, fontFamily: "var(--font-display)" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.42)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 80, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  visible: boolean;
  delay?: number;
};

function FeatureCard({ icon, title, desc, accent, visible, delay = 0 }: FeatureCardProps) {
  return (
    <div
      className="glass feature-card rounded-2xl p-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms`,
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}2e`,
        }}
      >
        {icon}
      </div>
      <h3
        className="font-semibold text-white mb-2 text-[15px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.52)" }}
      >
        {desc}
      </p>
    </div>
  );
}

function Step({
  num,
  title,
  desc,
  visible,
  delay,
}: {
  num: number;
  title: string;
  desc: string;
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className="flex gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-18px)",
        transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms`,
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
        style={{
          background: "linear-gradient(135deg,#5B7FFF,#6B8AFF)",
          boxShadow: "0 0 16px rgba(91,127,255,0.4)",
          fontFamily: "var(--font-display)",
        }}
      >
        {num}
      </div>
      <div className="pt-1">
        <div
          className="font-semibold text-white mb-1 text-[15px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </div>
        <div
          className="text-sm"
          style={{ color: "rgba(255,255,255,0.48)" }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function AppStoreWaitlistButton({
  size = "default",
  label,
  subtitle,
  ctaLabel,
  onClick,
}: {
  size?: "default" | "lg";
  label: string;
  subtitle: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  const Icon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );

  return (
    <div className="relative">
      {size === "lg" ? (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white btn-primary cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {Icon}
          {ctaLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl transition-all hover:scale-105 hover:-translate-y-0.5 cursor-pointer"
          style={{
            background: "rgba(28,31,50,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {Icon}
          <div className="text-left">
            <div className="text-white/45 text-[9px]">{subtitle}</div>
            <div
              className="text-white font-semibold text-sm"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {ctaLabel}
            </div>
          </div>
        </button>
      )}
      <span
        className="absolute -top-2 -right-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: "rgba(255,150,50,0.9)",
          color: "white",
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function GooglePlayDisabled({ label }: { label: string }) {
  return (
    <div className="relative">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl opacity-50 cursor-not-allowed select-none"
        style={{
          background: "rgba(28,31,50,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            d="M3 20.5v-17c0-.83.95-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.65.5-1.6.03-1.6-.8z"
            fill="url(#gp2)"
          />
          <defs>
            <linearGradient id="gp2" x1="3" y1="3" x2="21" y2="21">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#5B7FFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-left">
          <div className="text-white/45 text-[9px]">Get it on</div>
          <div
            className="text-white font-semibold text-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Google Play
          </div>
        </div>
      </div>
      <span
        className="absolute -top-2 -right-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: "rgba(255,150,50,0.9)",
          color: "white",
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function Page() {
  const locale = useLocale();
  const t = useTranslations();
  const feat = useReveal();
  const detail = useReveal();
  const steps = useReveal();
  const cta = useReveal();
  const shots = useReveal();
  const [hero, setHero] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistSource, setWaitlistSource] = useState<string>("nav");

  const openWaitlist = (source: string) => {
    setWaitlistSource(source);
    setWaitlistOpen(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setHero(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const trans = (delay = 0) => ({
    opacity: hero ? 1 : 0,
    transform: hero ? "translateY(0)" : "translateY(22px)",
    transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
  });

  const localePath = (path: string) =>
    locale === "en" ? `/en${path}` : path;

  return (
    <div className="mesh-gradient min-h-screen">
      <nav
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
        style={{
          background: "rgba(13,15,26,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(91,127,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={t("nav.appName")}
            width={32}
            height={32}
            className="rounded-[4px]"
          />
          <span
            className="font-bold text-white text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("nav.appName")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => openWaitlist("nav")}
            className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm text-white btn-primary cursor-pointer"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("nav.waitlist")}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7h8M7 3l4 4-4 4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6 md:px-12 overflow-hidden">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle,rgba(91,127,255,0.11) 0%,transparent 70%)",
            filter: "blur(48px)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle,rgba(245,158,11,0.07) 0%,transparent 70%)",
            filter: "blur(48px)",
          }}
        />

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 text-center md:text-left">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
              style={{
                ...trans(),
                background: "rgba(91,127,255,0.1)",
                border: "1px solid rgba(91,127,255,0.22)",
                color: "#6B8AFF",
              }}
            >
              <LiveDot />
              {t("hero.badge")}
            </div>

            <h1
              className="font-bold leading-[1.1] mb-5"
              style={{
                ...trans(80),
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px,5vw,56px)",
              }}
            >
              <span className="text-gradient">{t("hero.headline1")}</span>
              <br />
              <span className="text-white">{t("hero.headline2")}</span>
            </h1>

            <p
              className="text-base md:text-lg mb-8 max-w-md mx-auto md:mx-0 leading-relaxed"
              style={{ ...trans(160), color: "rgba(255,255,255,0.52)" }}
            >
              {t("hero.sub")}
            </p>

            <div
              className="flex gap-6 mb-8 justify-center md:justify-start"
              style={trans(240)}
            >
              {[
                { v: t("hero.stat1Value"), l: t("hero.stat1Label") },
                { v: t("hero.stat2Value"), l: t("hero.stat2Label") },
                { v: t("hero.stat3Value"), l: t("hero.stat3Label") },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div
                    className="font-bold text-xl mb-0.5"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "#6B8AFF",
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
              style={trans(320)}
            >
              <AppStoreWaitlistButton
                size="default"
                label={t("hero.iosComingSoon")}
                subtitle={t("hero.appStoreSubtitle")}
                ctaLabel={t("hero.appStore")}
                onClick={() => openWaitlist("hero")}
              />

              <GooglePlayDisabled label={t("hero.androidComingSoon")} />
            </div>
          </div>

          <div
            className="order-1 md:order-2 flex justify-center"
            style={{
              animation: "float 6s ease-in-out infinite",
              opacity: hero ? 1 : 0,
              transition: "opacity .8s ease .15s",
            }}
          >
            <PhoneMockup />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(91,127,255,0.18),transparent)",
          }}
        />
      </div>

      <section id="features" className="py-24 px-6 md:px-12">
        <div ref={feat.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-14"
            style={{
              opacity: feat.visible ? 1 : 0,
              transform: feat.visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity .5s ease, transform .5s ease",
            }}
          >
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("features.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px,4vw,40px)",
              }}
            >
              {t("features.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.43)", fontSize: 15 }}>
              {t("features.sub")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: t("features.f1Icon"), title: t("features.f1Title"), desc: t("features.f1Desc"), accent: "#5B7FFF" },
              { icon: t("features.f2Icon"), title: t("features.f2Title"), desc: t("features.f2Desc"), accent: "#10B981" },
              { icon: t("features.f3Icon"), title: t("features.f3Title"), desc: t("features.f3Desc"), accent: "#F59E0B" },
              { icon: t("features.f4Icon"), title: t("features.f4Title"), desc: t("features.f4Desc"), accent: "#FF6B6B" },
            ].map((f, i) => (
              <FeatureCard
                key={i}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                accent={f.accent}
                visible={feat.visible}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 overflow-hidden">
        <div ref={shots.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-14"
            style={{
              opacity: shots.visible ? 1 : 0,
              transform: shots.visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity .5s ease, transform .5s ease",
            }}
          >
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("screenshots.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px,4vw,40px)",
              }}
            >
              {t("screenshots.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.43)", fontSize: 15 }}>
              {t("screenshots.sub")}
            </p>
          </div>

          <div
            className="flex items-end justify-center gap-6 md:gap-10"
            style={{
              opacity: shots.visible ? 1 : 0,
              transform: shots.visible ? "translateY(0)" : "translateY(32px)",
              transition: "opacity .6s ease .1s, transform .6s ease .1s",
            }}
          >
            <div
              className="hidden sm:flex flex-col items-center gap-5"
              style={{ transform: "rotate(-4deg) translateY(24px)", transformOrigin: "bottom center" }}
            >
              <ReadingListPhone />
              <div className="text-center">
                <div className="font-semibold text-white" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
                  {t("screenshots.readingList.title")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4, maxWidth: 160 }}>
                  {t("screenshots.readingList.desc")}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 z-10">
              <div
                style={{
                  filter: "drop-shadow(0 0 32px rgba(91,127,255,0.28)) drop-shadow(0 24px 48px rgba(0,0,0,0.55))",
                }}
              >
                <ReadingLogPhone />
              </div>
              <div className="text-center">
                <div className="font-semibold text-white" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
                  {t("screenshots.progress.title")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4, maxWidth: 180 }}>
                  {t("screenshots.progress.desc")}
                </div>
              </div>
            </div>

            <div
              className="hidden sm:flex flex-col items-center gap-5"
              style={{ transform: "rotate(4deg) translateY(24px)", transformOrigin: "bottom center" }}
            >
              <StatsPhone />
              <div className="text-center">
                <div className="font-semibold text-white" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
                  {t("screenshots.stats.title")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4, maxWidth: 160 }}>
                  {t("screenshots.stats.desc")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(91,127,255,0.18),transparent)",
          }}
        />
      </div>

      <section className="py-20 px-6 md:px-12">
        <div ref={detail.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-14"
            style={{
              opacity: detail.visible ? 1 : 0,
              transform: detail.visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity .5s ease, transform .5s ease",
            }}
          >
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("appDetail.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px,4vw,40px)",
              }}
            >
              {t("appDetail.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.43)", fontSize: 15 }}>
              {t("appDetail.sub")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: t("appDetail.d1Icon"), title: t("appDetail.d1Title"), desc: t("appDetail.d1Desc"), accent: "#5B7FFF" },
              { icon: t("appDetail.d2Icon"), title: t("appDetail.d2Title"), desc: t("appDetail.d2Desc"), accent: "#10B981" },
              { icon: t("appDetail.d3Icon"), title: t("appDetail.d3Title"), desc: t("appDetail.d3Desc"), accent: "#F59E0B" },
              { icon: t("appDetail.d4Icon"), title: t("appDetail.d4Title"), desc: t("appDetail.d4Desc"), accent: "#FF6B6B" },
            ].map((item, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-7"
                style={{
                  opacity: detail.visible ? 1 : 0,
                  transform: detail.visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity .5s ease ${i * 80}ms, transform .5s ease ${i * 80}ms`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: `${item.accent}18`,
                      border: `1px solid ${item.accent}2e`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-white mb-2"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.52)" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12">
        <div
          className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 grid md:grid-cols-2 gap-12 items-center"
          style={{
            background: "rgba(28,31,50,0.55)",
            border: "1px solid rgba(91,127,255,0.1)",
          }}
        >
          <div>
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("howItWorks.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(22px,3vw,34px)",
              }}
            >
              {t("howItWorks.title")}
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.43)",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {t("howItWorks.sub")}
            </p>
          </div>

          <div ref={steps.ref} className="flex flex-col gap-6">
            <Step
              num={1}
              title={t("howItWorks.s1Title")}
              desc={t("howItWorks.s1Desc")}
              visible={steps.visible}
              delay={0}
            />
            <div
              style={{
                width: 1,
                height: 20,
                background: "rgba(91,127,255,0.18)",
                marginLeft: 20,
              }}
            />
            <Step
              num={2}
              title={t("howItWorks.s2Title")}
              desc={t("howItWorks.s2Desc")}
              visible={steps.visible}
              delay={120}
            />
            <div
              style={{
                width: 1,
                height: 20,
                background: "rgba(91,127,255,0.18)",
                marginLeft: 20,
              }}
            />
            <Step
              num={3}
              title={t("howItWorks.s3Title")}
              desc={t("howItWorks.s3Desc")}
              visible={steps.visible}
              delay={240}
            />
          </div>
        </div>
      </section>

      <section id="download" className="py-24 px-6 md:px-12">
        <div
          ref={cta.ref}
          className="max-w-3xl mx-auto text-center"
          style={{
            opacity: cta.visible ? 1 : 0,
            transform: cta.visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity .6s ease, transform .6s ease",
          }}
        >
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt={t("nav.appName")}
              width={80}
              height={80}
              className="rounded-[4px]"
              style={{
                boxShadow:
                  "0 0 40px rgba(91,127,255,0.38), 0 20px 40px rgba(0,0,0,0.5)",
              }}
            />
          </div>

          <h2
            className="font-bold mb-4 text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px,4vw,44px)",
            }}
          >
            {t("cta.title")}
          </h2>
          <p
            className="mb-10 text-base"
            style={{
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.75,
            }}
          >
            {t("cta.sub")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <AppStoreWaitlistButton
              size="lg"
              label={t("hero.iosComingSoon")}
              subtitle={t("hero.appStoreSubtitle")}
              ctaLabel={t("hero.appStore")}
              onClick={() => openWaitlist("cta")}
            />
            <GooglePlayDisabled label={t("hero.androidComingSoon")} />
          </div>
        </div>
      </section>

      <footer
        className="px-6 md:px-12 py-10"
        style={{ borderTop: "1px solid rgba(91,127,255,0.08)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt={t("nav.appName")}
                width={24}
                height={24}
                className="rounded-[4px]"
              />
              <span
                className="font-semibold text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {t("footer.copyright")}{" "}
                <a
                  href="https://github.com/byungsker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/70 transition-colors underline underline-offset-2"
                  style={{ color: "rgba(107,138,255,0.8)" }}
                >
                  {t("footer.developerName")}
                </a>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/byungsker"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/55 transition-colors"
                style={{ color: "rgba(255,255,255,0.38)" }}
                title="GitHub"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="mailto:extreme0728@gmail.com"
                className="hover:text-white/55 transition-colors"
                style={{ color: "rgba(255,255,255,0.38)" }}
                title="Email"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(91,127,255,0.08)",
            }}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {t("footer.tagline")}
            </p>
            <div
              className="flex gap-5 text-xs"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <a
                href={localePath("/privacy")}
                className="hover:text-white/55 transition-colors"
              >
                {t("footer.privacy")}
              </a>
              <a
                href={localePath("/terms")}
                className="hover:text-white/55 transition-colors"
              >
                {t("footer.terms")}
              </a>
            </div>
          </div>
        </div>
      </footer>

      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        source={waitlistSource}
        locale={locale}
      />
    </div>
  );
}
